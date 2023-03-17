import { createRemoteJWKSet, JWTVerifyGetKey } from "jose";
import {
    RecipeInterface,
    VerifySessionOptions,
    TypeNormalisedInput,
    SessionInformation,
    SessionClaimValidator,
    SessionClaim,
    ClaimValidationError,
    TokenTransferMethod,
} from "./types";
import * as SessionFunctions from "./sessionFunctions";
import {
    clearSession,
    getAntiCsrfTokenFromHeaders,
    setFrontTokenInHeaders,
    getToken,
    setToken,
    setCookie,
} from "./cookieAndHeaders";
import { attachTokensToResponse, validateClaimsInPayload } from "./utils";
import Session from "./sessionClass";
import STError from "./error";
import { normaliseHttpMethod, getRidFromHeader, isAnIpAddress } from "../../utils";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { JSONObject, NormalisedAppinfo } from "../../types";
import { logDebugMessage } from "../../logger";
import { BaseResponse } from "../../framework/response";
import { BaseRequest } from "../../framework/request";
import { availableTokenTransferMethods } from "./constants";
import { ParsedJWTInfo, parseJWTWithoutSignatureVerification } from "./jwt";
import { validateAccessTokenStructure } from "./accessToken";

export type Helpers = {
    querier: Querier;
    JWKS: JWTVerifyGetKey;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    getRecipeImpl: () => RecipeInterface;
};

// We are defining this here to reduce the scope of legacy code
const LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME = "sIdRefreshToken";
export const JWKCacheMaxAgeInMs = 60000;

export default function getRecipeInterface(
    querier: Querier,
    config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo,
    getRecipeImplAfterOverrides: () => RecipeInterface
): RecipeInterface {
    const JWKS: ReturnType<typeof createRemoteJWKSet>[] = querier
        .getAllCoreUrlsForPath("/.well-known/jwks.json")
        .map((url) =>
            createRemoteJWKSet(new URL(url), {
                cooldownDuration: 500,
                cacheMaxAge: JWKCacheMaxAgeInMs,
            })
        );

    const combinedJWKS: ReturnType<typeof createRemoteJWKSet> = async (...args) => {
        let lastError = undefined;
        if (JWKS.length === 0) {
            throw Error(
                "No SuperTokens core available to query. Please pass supertokens > connectionURI to the init function, or override all the functions of the recipe you are using."
            );
        }
        for (const jwks of JWKS) {
            try {
                // We await before returning to make sure we catch the error
                return await jwks(...args);
            } catch (ex) {
                lastError = ex;
            }
        }
        throw lastError;
    };

    let obj: RecipeInterface = {
        createNewSession: async function ({
            req,
            res,
            userId,
            accessTokenPayload = {},
            sessionData = {},
            useDynamicAccessTokenSigningKey,
            userContext,
        }: {
            req: BaseRequest;
            res: BaseResponse;
            userId: string;
            accessTokenPayload?: any;
            sessionData?: any;
            useDynamicAccessTokenSigningKey?: boolean;
            userContext: any;
        }): Promise<Session> {
            logDebugMessage("createNewSession: Started");
            let outputTransferMethod = config.getTokenTransferMethod({ req, forCreateNewSession: true, userContext });
            if (outputTransferMethod === "any") {
                outputTransferMethod = "header";
            }
            logDebugMessage("createNewSession: using transfer method " + outputTransferMethod);

            if (
                outputTransferMethod === "cookie" &&
                config.cookieSameSite === "none" &&
                !config.cookieSecure &&
                !(
                    (appInfo.topLevelAPIDomain === "localhost" || isAnIpAddress(appInfo.topLevelAPIDomain)) &&
                    (appInfo.topLevelWebsiteDomain === "localhost" || isAnIpAddress(appInfo.topLevelWebsiteDomain))
                )
            ) {
                // We can allow insecure cookie when both website & API domain are localhost or an IP
                // When either of them is a different domain, API domain needs to have https and a secure cookie to work
                throw new Error(
                    "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
                );
            }

            const disableAntiCSRF = outputTransferMethod === "header";

            let response = await SessionFunctions.createNewSession(
                helpers,
                userId,
                disableAntiCSRF,
                useDynamicAccessTokenSigningKey !== undefined
                    ? !useDynamicAccessTokenSigningKey
                    : config.useDynamicAccessTokenSigningKey === false,
                accessTokenPayload,
                sessionData
            );

            for (const transferMethod of availableTokenTransferMethods) {
                if (transferMethod !== outputTransferMethod && getToken(req, "access", transferMethod) !== undefined) {
                    clearSession(config, res, transferMethod);
                }
            }

            attachTokensToResponse(config, res, response, outputTransferMethod);
            return new Session(
                helpers,
                response.accessToken.token,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                res,
                req,
                outputTransferMethod
            );
        },

        getGlobalClaimValidators: async function (input: {
            claimValidatorsAddedByOtherRecipes: SessionClaimValidator[];
        }) {
            return input.claimValidatorsAddedByOtherRecipes;
        },

        /* In all cases if sIdRefreshToken token exists (so it's a legacy session) we return TRY_REFRESH_TOKEN. The refresh endpoint will clear this cookie and try to upgrade the session.
           Check https://supertokens.com/docs/contribute/decisions/session/0007 for further details and a table of expected behaviours
         */
        getSession: async function ({
            req,
            res,
            options,
            userContext,
        }: {
            req: BaseRequest;
            res: BaseResponse;
            options?: VerifySessionOptions;
            userContext: any;
        }): Promise<Session | undefined> {
            logDebugMessage("getSession: Started");

            // This token isn't handled by getToken to limit the scope of this legacy/migration code
            if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
                // This could create a spike on refresh calls during the update of the backend SDK
                throw new STError({
                    message: "using legacy session, please call the refresh API",
                    type: STError.TRY_REFRESH_TOKEN,
                });
            }

            const sessionOptional = options?.sessionRequired === false;
            logDebugMessage("getSession: optional validation: " + sessionOptional);

            const accessTokens: {
                [key in TokenTransferMethod]?: ParsedJWTInfo;
            } = {};

            // We check all token transfer methods for available access tokens
            for (const transferMethod of availableTokenTransferMethods) {
                const tokenString = getToken(req, "access", transferMethod);
                if (tokenString !== undefined) {
                    try {
                        const info = parseJWTWithoutSignatureVerification(tokenString);
                        validateAccessTokenStructure(info.payload, info.version);
                        logDebugMessage("getSession: got access token from " + transferMethod);
                        accessTokens[transferMethod] = info;
                    } catch {
                        logDebugMessage(
                            `getSession: ignoring token in ${transferMethod}, because it doesn't match our access token structure`
                        );
                    }
                }
            }

            const allowedTransferMethod = config.getTokenTransferMethod({
                req,
                forCreateNewSession: false,
                userContext,
            });
            let requestTransferMethod: TokenTransferMethod;
            let accessToken: ParsedJWTInfo | undefined;

            if (
                (allowedTransferMethod === "any" || allowedTransferMethod === "header") &&
                accessTokens["header"] !== undefined
            ) {
                logDebugMessage("getSession: using header transfer method");
                requestTransferMethod = "header";
                accessToken = accessTokens["header"];
            } else if (
                (allowedTransferMethod === "any" || allowedTransferMethod === "cookie") &&
                accessTokens["cookie"] !== undefined
            ) {
                logDebugMessage("getSession: using cookie transfer method");
                requestTransferMethod = "cookie";
                accessToken = accessTokens["cookie"];
            } else {
                if (sessionOptional) {
                    logDebugMessage(
                        "getSession: returning undefined because accessToken is undefined and sessionRequired is false"
                    );
                    // there is no session that exists here, and the user wants session verification
                    // to be optional. So we return undefined.
                    return undefined;
                }

                logDebugMessage("getSession: UNAUTHORISED because accessToken in request is undefined");
                throw new STError({
                    message:
                        "Session does not exist. Are you sending the session tokens in the request with the appropriate token transfer method?",
                    type: STError.UNAUTHORISED,
                    payload: {
                        // we do not clear the session here because of a
                        // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                        clearTokens: false,
                    },
                });
            }

            let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
            let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;

            if (doAntiCsrfCheck === undefined) {
                doAntiCsrfCheck = normaliseHttpMethod(req.getMethod()) !== "get";
            }

            if (requestTransferMethod === "header") {
                doAntiCsrfCheck = false;
            }

            logDebugMessage("getSession: Value of doAntiCsrfCheck is: " + doAntiCsrfCheck);

            let response = await SessionFunctions.getSession(
                helpers,
                accessToken,
                antiCsrfToken,
                doAntiCsrfCheck,
                getRidFromHeader(req) !== undefined,
                options?.checkDatabase === true
            );
            let accessTokenString = accessToken.rawTokenString;
            if (response.accessToken !== undefined) {
                setFrontTokenInHeaders(
                    res,
                    response.session.userId,
                    response.accessToken.expiry,
                    response.session.userDataInJWT
                );
                setToken(
                    config,
                    res,
                    "access",
                    response.accessToken.token,
                    // We set the expiration to 100 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
                    // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
                    // Even if the token is expired the presence of the token indicates that the user could have a valid refresh
                    // Setting them to infinity would require special case handling on the frontend and just adding 10 years seems enough.
                    Date.now() + 3153600000000,
                    requestTransferMethod
                );
                accessTokenString = response.accessToken.token;
            }
            logDebugMessage("getSession: Success!");
            const session = new Session(
                helpers,
                accessTokenString,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                res,
                req,
                requestTransferMethod
            );

            return session;
        },

        validateClaims: async function (
            this: RecipeInterface,
            input: {
                userId: string;
                accessTokenPayload: any;
                claimValidators: SessionClaimValidator[];
                userContext: any;
            }
        ): Promise<{
            invalidClaims: ClaimValidationError[];
            accessTokenPayloadUpdate?: any;
        }> {
            let accessTokenPayload = input.accessTokenPayload;
            let accessTokenPayloadUpdate = undefined;
            const origSessionClaimPayloadJSON = JSON.stringify(accessTokenPayload);

            for (const validator of input.claimValidators) {
                logDebugMessage("updateClaimsInPayloadIfNeeded checking shouldRefetch for " + validator.id);
                if ("claim" in validator && (await validator.shouldRefetch(accessTokenPayload, input.userContext))) {
                    logDebugMessage("updateClaimsInPayloadIfNeeded refetching " + validator.id);
                    const value = await validator.claim.fetchValue(input.userId, input.userContext);
                    logDebugMessage(
                        "updateClaimsInPayloadIfNeeded " + validator.id + " refetch result " + JSON.stringify(value)
                    );
                    if (value !== undefined) {
                        accessTokenPayload = validator.claim.addToPayload_internal(
                            accessTokenPayload,
                            value,
                            input.userContext
                        );
                    }
                }
            }

            if (JSON.stringify(accessTokenPayload) !== origSessionClaimPayloadJSON) {
                accessTokenPayloadUpdate = accessTokenPayload;
            }

            const invalidClaims = await validateClaimsInPayload(
                input.claimValidators,
                accessTokenPayload,
                input.userContext
            );

            return {
                invalidClaims,
                accessTokenPayloadUpdate,
            };
        },

        validateClaimsInJWTPayload: async function (
            this: RecipeInterface,
            input: {
                userId: string;
                jwtPayload: JSONObject;
                claimValidators: SessionClaimValidator[];
                userContext: any;
            }
        ): Promise<{
            status: "OK";
            invalidClaims: ClaimValidationError[];
        }> {
            // We skip refetching here, because we have no way of updating the JWT payload here
            // if we have access to the entire session other methods can be used to do validation while updating
            const invalidClaims = await validateClaimsInPayload(
                input.claimValidators,
                input.jwtPayload,
                input.userContext
            );

            return {
                status: "OK",
                invalidClaims,
            };
        },

        getSessionInformation: async function ({
            sessionHandle,
        }: {
            sessionHandle: string;
        }): Promise<SessionInformation | undefined> {
            return SessionFunctions.getSessionInformation(helpers, sessionHandle);
        },

        /*
            In all cases: if sIdRefreshToken token exists (so it's a legacy session) we clear it.
            Check http://localhost:3002/docs/contribute/decisions/session/0008 for further details and a table of expected behaviours
         */
        refreshSession: async function (
            this: RecipeInterface,
            { req, res, userContext }: { req: BaseRequest; res: BaseResponse; userContext: any }
        ): Promise<Session> {
            logDebugMessage("refreshSession: Started");

            const refreshTokens: {
                [key in TokenTransferMethod]?: string;
            } = {};

            // We check all token transfer methods for available refresh tokens
            // We do this so that we can later clear all we are not overwriting
            for (const transferMethod of availableTokenTransferMethods) {
                refreshTokens[transferMethod] = getToken(req, "refresh", transferMethod);
                if (refreshTokens[transferMethod] !== undefined) {
                    logDebugMessage("refreshSession: got refresh token from " + transferMethod);
                }
            }

            const allowedTransferMethod = config.getTokenTransferMethod({
                req,
                forCreateNewSession: false,
                userContext,
            });
            logDebugMessage("refreshSession: getTokenTransferMethod returned " + allowedTransferMethod);

            let requestTransferMethod: TokenTransferMethod;
            let refreshToken: string | undefined;

            if (
                (allowedTransferMethod === "any" || allowedTransferMethod === "header") &&
                refreshTokens["header"] !== undefined
            ) {
                logDebugMessage("refreshSession: using header transfer method");
                requestTransferMethod = "header";
                refreshToken = refreshTokens["header"];
            } else if (
                (allowedTransferMethod === "any" || allowedTransferMethod === "cookie") &&
                refreshTokens["cookie"]
            ) {
                logDebugMessage("refreshSession: using cookie transfer method");
                requestTransferMethod = "cookie";
                refreshToken = refreshTokens["cookie"];
            } else {
                // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
                if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
                    logDebugMessage(
                        "refreshSession: cleared legacy id refresh token because refresh token was not found"
                    );
                    setCookie(config, res, LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME, "", 0, "accessTokenPath");
                }

                logDebugMessage("refreshSession: UNAUTHORISED because refresh token in request is undefined");
                throw new STError({
                    message: "Refresh token not found. Are you sending the refresh token in the request?",
                    payload: {
                        clearTokens: false,
                    },
                    type: STError.UNAUTHORISED,
                });
            }

            try {
                let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
                let response = await SessionFunctions.refreshSession(
                    helpers,
                    refreshToken,
                    antiCsrfToken,
                    getRidFromHeader(req) !== undefined,
                    requestTransferMethod
                );
                logDebugMessage("refreshSession: Attaching refreshed session info as " + requestTransferMethod);

                // We clear the tokens in all token transfer methods we are not going to overwrite
                for (const transferMethod of availableTokenTransferMethods) {
                    if (transferMethod !== requestTransferMethod && refreshTokens[transferMethod] !== undefined) {
                        clearSession(config, res, transferMethod);
                    }
                }

                attachTokensToResponse(config, res, response, requestTransferMethod);

                logDebugMessage("refreshSession: Success!");
                // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
                if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
                    logDebugMessage("refreshSession: cleared legacy id refresh token after successful refresh");
                    setCookie(config, res, LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME, "", 0, "accessTokenPath");
                }

                return new Session(
                    helpers,
                    response.accessToken.token,
                    response.session.handle,
                    response.session.userId,
                    response.session.userDataInJWT,
                    res,
                    req,
                    requestTransferMethod
                );
            } catch (err) {
                if (err.type === STError.TOKEN_THEFT_DETECTED || err.payload.clearTokens) {
                    // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
                    if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
                        logDebugMessage(
                            "refreshSession: cleared legacy id refresh token because refresh is clearing other tokens"
                        );
                        setCookie(config, res, LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME, "", 0, "accessTokenPath");
                    }
                }
                throw err;
            }
        },

        regenerateAccessToken: async function (
            this: RecipeInterface,
            input: {
                accessToken: string;
                newAccessTokenPayload?: any;
                userContext: any;
            }
        ): Promise<
            | {
                  status: "OK";
                  session: {
                      handle: string;
                      userId: string;
                      userDataInJWT: any;
                  };
                  accessToken?: {
                      token: string;
                      expiry: number;
                      createdTime: number;
                  };
              }
            | undefined
        > {
            let newAccessTokenPayload =
                input.newAccessTokenPayload === null || input.newAccessTokenPayload === undefined
                    ? {}
                    : input.newAccessTokenPayload;
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/session/regenerate"), {
                accessToken: input.accessToken,
                userDataInJWT: newAccessTokenPayload,
            });
            if (response.status === "UNAUTHORISED") {
                return undefined;
            }
            return response;
        },

        revokeAllSessionsForUser: function ({ userId }: { userId: string }) {
            return SessionFunctions.revokeAllSessionsForUser(helpers, userId);
        },

        getAllSessionHandlesForUser: function ({ userId }: { userId: string }): Promise<string[]> {
            return SessionFunctions.getAllSessionHandlesForUser(helpers, userId);
        },

        revokeSession: function ({ sessionHandle }: { sessionHandle: string }): Promise<boolean> {
            return SessionFunctions.revokeSession(helpers, sessionHandle);
        },

        revokeMultipleSessions: function ({ sessionHandles }: { sessionHandles: string[] }) {
            return SessionFunctions.revokeMultipleSessions(helpers, sessionHandles);
        },

        updateSessionData: function ({
            sessionHandle,
            newSessionData,
        }: {
            sessionHandle: string;
            newSessionData: any;
        }): Promise<boolean> {
            return SessionFunctions.updateSessionData(helpers, sessionHandle, newSessionData);
        },

        mergeIntoAccessTokenPayload: async function (
            this: RecipeInterface,
            {
                sessionHandle,
                accessTokenPayloadUpdate,
                userContext,
            }: {
                sessionHandle: string;
                accessTokenPayloadUpdate: JSONObject;
                userContext: any;
            }
        ) {
            const sessionInfo = await this.getSessionInformation({ sessionHandle, userContext });
            if (sessionInfo === undefined) {
                return false;
            }
            const newAccessTokenPayload = { ...sessionInfo.accessTokenPayload, ...accessTokenPayloadUpdate };
            for (const key of Object.keys(accessTokenPayloadUpdate)) {
                if (accessTokenPayloadUpdate[key] === null) {
                    delete newAccessTokenPayload[key];
                }
            }

            return SessionFunctions.updateAccessTokenPayload(helpers, sessionHandle, newAccessTokenPayload);
        },

        fetchAndSetClaim: async function <T>(
            this: RecipeInterface,
            input: {
                sessionHandle: string;
                claim: SessionClaim<T>;
                userContext?: any;
            }
        ) {
            const sessionInfo = await this.getSessionInformation({
                sessionHandle: input.sessionHandle,
                userContext: input.userContext,
            });
            if (sessionInfo === undefined) {
                return false;
            }
            const accessTokenPayloadUpdate = await input.claim.build(sessionInfo.userId, input.userContext);

            return this.mergeIntoAccessTokenPayload({
                sessionHandle: input.sessionHandle,
                accessTokenPayloadUpdate,
                userContext: input.userContext,
            });
        },

        setClaimValue: function <T>(
            this: RecipeInterface,
            input: {
                sessionHandle: string;
                claim: SessionClaim<T>;
                value: T;
                userContext?: any;
            }
        ) {
            const accessTokenPayloadUpdate = input.claim.addToPayload_internal({}, input.value, input.userContext);
            return this.mergeIntoAccessTokenPayload({
                sessionHandle: input.sessionHandle,
                accessTokenPayloadUpdate,
                userContext: input.userContext,
            });
        },

        getClaimValue: async function <T>(
            this: RecipeInterface,
            input: { sessionHandle: string; claim: SessionClaim<T>; userContext?: any }
        ) {
            const sessionInfo = await this.getSessionInformation({
                sessionHandle: input.sessionHandle,
                userContext: input.userContext,
            });

            if (sessionInfo === undefined) {
                return {
                    status: "SESSION_DOES_NOT_EXIST_ERROR",
                };
            }

            return {
                status: "OK",
                value: input.claim.getValueFromPayload(sessionInfo.accessTokenPayload, input.userContext),
            };
        },

        removeClaim: function (
            this: RecipeInterface,
            input: { sessionHandle: string; claim: SessionClaim<any>; userContext?: any }
        ) {
            const accessTokenPayloadUpdate = input.claim.removeFromPayloadByMerge_internal({}, input.userContext);

            return this.mergeIntoAccessTokenPayload({
                sessionHandle: input.sessionHandle,
                accessTokenPayloadUpdate,
                userContext: input.userContext,
            });
        },
    };

    let helpers: Helpers = {
        querier,
        JWKS: combinedJWKS,
        config,
        appInfo,
        getRecipeImpl: getRecipeImplAfterOverrides,
    };

    if (process.env.TEST_MODE === "testing") {
        // testing mode, we add some of the help functions to the obj
        (obj as any).helpers = helpers;
    }

    return obj;
}
