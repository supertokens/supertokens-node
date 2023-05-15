import { createRemoteJWKSet, JWTVerifyGetKey } from "jose";
import {
    RecipeInterface,
    VerifySessionOptions,
    TypeNormalisedInput,
    SessionInformation,
    SessionClaimValidator,
    SessionClaim,
    ClaimValidationError,
    SessionContainerInterface,
    AntiCsrfType,
} from "./types";
import * as SessionFunctions from "./sessionFunctions";
import { buildFrontToken } from "./cookieAndHeaders";
import { validateClaimsInPayload } from "./utils";
import Session from "./sessionClass";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { JSONObject, NormalisedAppinfo } from "../../types";
import { logDebugMessage } from "../../logger";
import { ParsedJWTInfo, parseJWTWithoutSignatureVerification } from "./jwt";
import { validateAccessTokenStructure } from "./accessToken";
import SessionError from "./error";

export type Helpers = {
    querier: Querier;
    JWKS: JWTVerifyGetKey;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    getRecipeImpl: () => RecipeInterface;
};

export const JWKCacheMaxAgeInMs = 60000;

export const protectedProps = [
    "sub",
    "iat",
    "exp",
    "sessionHandle",
    "parentRefreshTokenHash1",
    "refreshTokenHash1",
    "antiCsrfToken",
];

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

    /**
        This function fetches all JWKs from the first available core instance. This combines the other JWKS functions to become
        error resistant.

        Every core instance a backend is connected to is expected to connect to the same database and use the same key set for
        token verification. Otherwise, the result of session verification would depend on which core is currently available.
    */
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
            userId,
            accessTokenPayload = {},
            sessionDataInDatabase = {},
            disableAntiCsrf,
        }: {
            userId: string;
            disableAntiCsrf?: boolean;
            accessTokenPayload?: any;
            sessionDataInDatabase?: any;
            userContext: any;
        }): Promise<SessionContainerInterface> {
            logDebugMessage("createNewSession: Started");

            let response = await SessionFunctions.createNewSession(
                helpers,
                userId,
                disableAntiCsrf === true,
                accessTokenPayload,
                sessionDataInDatabase
            );
            logDebugMessage("createNewSession: Finished");

            const payload = parseJWTWithoutSignatureVerification(response.accessToken.token).payload;
            return new Session(
                helpers,
                response.accessToken.token,
                buildFrontToken(response.session.userId, response.accessToken.expiry, payload),
                response.refreshToken,
                response.antiCsrfToken,
                response.session.handle,
                response.session.userId,
                payload,
                undefined,
                true
            );
        },

        getGlobalClaimValidators: async function (input: {
            claimValidatorsAddedByOtherRecipes: SessionClaimValidator[];
        }) {
            return input.claimValidatorsAddedByOtherRecipes;
        },

        getSession: async function ({
            accessToken: accessTokenString,
            antiCSRF = "NONE",
            antiCsrfToken,
            options,
        }: {
            accessToken: string;
            antiCSRF: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
            antiCsrfToken?: string;
            options?: VerifySessionOptions;
            userContext: any;
        }): Promise<SessionContainerInterface | undefined> {
            if (options?.antiCsrfCheck !== false && antiCSRF === "VIA_CUSTOM_HEADER") {
                throw new Error(
                    "Since the anti-csrf mode is VIA_CUSTOM_HEADER getSession can't check the CSRF token. Please either use VIA_TOKEN or set antiCsrfCheck to false"
                );
            }
            logDebugMessage("getSession: Started");

            let accessToken: ParsedJWTInfo | undefined;
            try {
                accessToken = parseJWTWithoutSignatureVerification(accessTokenString);
                validateAccessTokenStructure(accessToken.payload, accessToken.version);
            } catch (error) {
                if (options?.sessionRequired === false) {
                    logDebugMessage(
                        "getSession: Returning undefined because parsing failed and sessionRequired is false"
                    );
                    return undefined;
                }
                throw new SessionError({
                    message: "Token parsing failed",
                    type: "UNAUTHORISED",
                    payload: { clearTokens: false },
                });
            }

            const response = await SessionFunctions.getSession(
                helpers,
                accessToken,
                antiCsrfToken,
                options?.antiCsrfCheck !== false,
                options?.checkDatabase === true,
                antiCSRF
            );

            logDebugMessage("getSession: Success!");
            const payload =
                accessToken.version >= 3
                    ? response.accessToken !== undefined
                        ? parseJWTWithoutSignatureVerification(response.accessToken.token).payload
                        : accessToken.payload
                    : response.session.userDataInJWT;
            const session = new Session(
                helpers,
                response.accessToken !== undefined ? response.accessToken.token : accessTokenString,
                buildFrontToken(
                    response.session.userId,
                    response.accessToken !== undefined ? response.accessToken.expiry : response.session.expiryTime,
                    payload
                ),
                undefined, // refresh
                antiCsrfToken,
                response.session.handle,
                response.session.userId,
                payload,
                undefined,
                response.accessToken !== undefined
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

        refreshSession: async function (
            this: RecipeInterface,
            {
                refreshToken,
                antiCsrfToken,
                disableAntiCsrf,
                antiCSRF,
            }: { refreshToken: string; antiCsrfToken?: string; disableAntiCsrf: boolean; antiCSRF: AntiCsrfType }
        ): Promise<SessionContainerInterface> {
            if (disableAntiCsrf !== true && antiCSRF === "VIA_CUSTOM_HEADER") {
                throw new Error(
                    "Since the anti-csrf mode is VIA_CUSTOM_HEADER getSession can't check the CSRF token. Please either use VIA_TOKEN or set antiCsrfCheck to false"
                );
            }
            logDebugMessage("refreshSession: Started");

            const response = await SessionFunctions.refreshSession(
                helpers,
                refreshToken,
                antiCsrfToken,
                disableAntiCsrf,
                antiCSRF
            );

            logDebugMessage("refreshSession: Success!");

            const payload = parseJWTWithoutSignatureVerification(response.accessToken.token).payload;
            return new Session(
                helpers,
                response.accessToken.token,
                buildFrontToken(response.session.userId, response.accessToken.expiry, payload),
                response.refreshToken,
                response.antiCsrfToken,
                response.session.handle,
                response.session.userId,
                payload,
                undefined,
                true
            );
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

        updateSessionDataInDatabase: function ({
            sessionHandle,
            newSessionData,
        }: {
            sessionHandle: string;
            newSessionData: any;
        }): Promise<boolean> {
            return SessionFunctions.updateSessionDataInDatabase(helpers, sessionHandle, newSessionData);
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
            let newAccessTokenPayload = { ...sessionInfo.customClaimsInAccessTokenPayload };
            for (const key of protectedProps) {
                delete newAccessTokenPayload[key];
            }

            newAccessTokenPayload = { ...newAccessTokenPayload, ...accessTokenPayloadUpdate };
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
                value: input.claim.getValueFromPayload(sessionInfo.customClaimsInAccessTokenPayload, input.userContext),
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
