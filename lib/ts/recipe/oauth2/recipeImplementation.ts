import { RecipeInterface, TokenBuilderInfo } from "./types";
import { Querier } from "../../querier";
import SessionWrapper, { SessionInformation } from "../session";
import JWT from "../jwt";
import { JSONObject } from "../usermetadata";
import { NormalisedAppinfo } from "../../types";
import NormalisedURLPath from "../../normalisedURLPath";
import { defaultIdTokenLifetimeInSecs } from "./constants";

export default function getRecipeImplementation(appInfo: NormalisedAppinfo, querier: Querier): RecipeInterface {
    return {
        buildAccessToken: async function (input) {
            let payload: JSONObject = {
                iss: appInfo.apiDomain.getAsStringDangerous(),
                aud: [input.tokenInfo.clientId],
            };
            if (input.sessionInformation) {
                payload.sub = input.sessionInformation.userId;
            } else {
                payload.sub = input.tokenInfo.clientId;
            }
            return payload;
        },
        buildIdToken: async function (input) {
            const payload = await buildDefaultIdToken(appInfo, input);
            return {
                payload,
                lifetimeInSecs: defaultIdTokenLifetimeInSecs,
            };
        },
        createAuthCode: async function (this: RecipeInterface, input) {
            const builderInput: BuilderInput = {
                tokenInfo: {
                    clientId: input.clientId,
                    scopes: input.scopes,
                    sessionHandle: input.sessionHandle,
                    queryString: input.queryString,
                },
                userContext: input.userContext,
            };

            if (builderInput.tokenInfo.sessionHandle) {
                const sessionInfo = await SessionWrapper.getSessionInformation(builderInput.tokenInfo.sessionHandle);
                if (sessionInfo === undefined) {
                    return {
                        status: "AUTH_ERROR",
                        error: "access_denied",
                    };
                }
                builderInput.sessionInformation = sessionInfo;
            }
            const scopeValidationResult = await this.validateScopes(builderInput);
            if (scopeValidationResult.status === "INVALID_SCOPE_ERROR") {
                return {
                    status: "CLIENT_ERROR",
                    error: "invalid_scope",
                };
            }
            if (scopeValidationResult.status === "ACCESS_DENIED_ERROR") {
                return {
                    status: "AUTH_ERROR",
                    error: "access_denied",
                };
            }
            builderInput.tokenInfo.scopes = scopeValidationResult.grantedScopes;

            let idToken;
            if (input.responseTypes.includes("id_token")) {
                const idTokenInfo = await this.buildIdToken(builderInput);
                const payload = idTokenInfo.payload ?? (await buildDefaultIdToken(appInfo, builderInput));
                const jwtResult = await JWT.createJWT(
                    payload,
                    idTokenInfo.lifetimeInSecs ?? defaultIdTokenLifetimeInSecs
                );
                if (jwtResult.status !== "OK") {
                    throw new Error("Should never happen - JWT creation failed");
                }
                idToken = jwtResult.jwt;
            }
            let coreRequest: any = {
                clientId: input.clientId,
                sessionHandle: input.sessionHandle,
                scopes: scopeValidationResult.grantedScopes,
                redirectUri: input.redirectUri,
                queryString: input.queryString,
            };
            const accessTokenInfo = await this.buildAccessToken(builderInput);
            coreRequest.accessTokenPayload = accessTokenInfo;
            coreRequest.accessTokenLifetime = accessTokenInfo.lifetimeInSecs;
            coreRequest.expiresAfterMs = 1234;

            if (await this.shouldIssueRefreshToken(builderInput)) {
                coreRequest.refreshTokenLifetime = this.getRefreshTokenLifetime(builderInput);
                coreRequest.accessType = "online";
            }

            if (input.codeChallenge) {
                coreRequest.codeChallenge = input.codeChallenge;
                coreRequest.codeChallengeMethod = input.codeChallengeMethod;
            }

            const resp = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/oauth2/authorizationcode"),
                coreRequest
            );
            if (resp.status === "OK") {
                return {
                    status: "OK",
                    code: resp.authorizationCode,
                    idToken,
                };
            }
            if (resp.status === "UNKNOWN_CLIENT_ID_ERROR") {
                return {
                    status: "CLIENT_ERROR",
                    error: "unauthorized_client",
                };
            }

            if (resp.status === "UNKNOWN_REDIRECT_URI_ERROR") {
                return {
                    status: "CLIENT_ERROR",
                    error: "invalid_request",
                };
            }

            if (resp.status === "UNKNOWN_SCOPE_ERROR") {
                return {
                    status: "CLIENT_ERROR",
                    error: "invalid_scope",
                };
            }

            if (resp.status === "UNKNOWN_SESSION_HANDLE_ERROR") {
                return {
                    status: "AUTH_ERROR",
                    error: "session_expired",
                };
            }
            // This should basically never happen, but as a fallback we can return to
            return {
                status: "CLIENT_ERROR",
                error: "server_error",
                errorDescription: resp.status,
            };
        },

        createTokens: async function (input) {
            const builderInput: BuilderInput = {
                tokenInfo: {
                    clientId: input.clientId,
                    scopes: input.scopes,
                    sessionHandle: input.sessionHandle,
                    queryString: input.queryString,
                },
                userContext: input.userContext,
            };

            if (builderInput.tokenInfo.sessionHandle) {
                const sessionInfo = await SessionWrapper.getSessionInformation(builderInput.tokenInfo.sessionHandle);
                if (sessionInfo === undefined) {
                    return {
                        status: "AUTH_ERROR",
                        error: "access_denied",
                    };
                }
                builderInput.sessionInformation = sessionInfo;
            }
            const scopeValidationResult = await this.validateScopes(builderInput);
            if (scopeValidationResult.status === "INVALID_SCOPE_ERROR") {
                return {
                    status: "CLIENT_ERROR",
                    error: "invalid_scope",
                };
            }
            if (scopeValidationResult.status === "ACCESS_DENIED_ERROR") {
                return {
                    status: "AUTH_ERROR",
                    error: "access_denied",
                };
            }
            builderInput.tokenInfo.scopes = scopeValidationResult.grantedScopes;
        },
    };
}
type BuilderInput = {
    tokenInfo: TokenBuilderInfo;
    sessionInformation?: SessionInformation;
    userContext: any;
};

async function buildDefaultIdToken(appInfo: NormalisedAppinfo, input: BuilderInput): Promise<JSONObject> {
    let payload: JSONObject = {
        iss: appInfo.apiDomain.getAsStringDangerous(),
        aud: [input.tokenInfo.clientId],
    };
    if (input.sessionInformation) {
        payload.sub = input.sessionInformation.userId;
    } else {
        // Client credentials flow - we don't have a session
        payload.sub = input.tokenInfo.clientId;
    }

    if (input.tokenInfo.queryString !== undefined) {
        const params = new URLSearchParams(input.tokenInfo.queryString);
        const nonce = params.get("nonce");
        if (nonce !== null) {
            payload.nonce = nonce;
        }
    }
    return payload;
}
