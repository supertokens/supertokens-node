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
import RecipeUserId from "../../recipeUserId";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { JWKCacheCooldownInMs, JWKCacheMaxAgeInMs, protectedProps } from "./constants";

export type Helpers = {
    querier: Querier;
    JWKS: JWTVerifyGetKey;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    getRecipeImpl: () => RecipeInterface;
};

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
                cooldownDuration: JWKCacheCooldownInMs,
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
            recipeUserId,
            accessTokenPayload = {},
            sessionDataInDatabase = {},
            disableAntiCsrf,
            tenantId,
            userContext,
        }: {
            userId: string;
            recipeUserId: RecipeUserId;
            disableAntiCsrf?: boolean;
            accessTokenPayload?: any;
            sessionDataInDatabase?: any;
            tenantId: string;
            userContext: any;
        }): Promise<SessionContainerInterface> {
            logDebugMessage("createNewSession: Started");

            let response = await SessionFunctions.createNewSession(
                helpers,
                tenantId,
                recipeUserId,
                disableAntiCsrf === true,
                accessTokenPayload,
                sessionDataInDatabase,
                userContext
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
                response.session.recipeUserId,
                payload,
                undefined,
                true,
                tenantId
            );
        },

        getGlobalClaimValidators: async function (input: {
            claimValidatorsAddedByOtherRecipes: SessionClaimValidator[];
        }) {
            return input.claimValidatorsAddedByOtherRecipes;
        },

        getSession: async function ({
            accessToken: accessTokenString,
            antiCsrfToken,
            options,
            userContext,
        }: {
            accessToken: string;
            antiCsrfToken?: string;
            options?: VerifySessionOptions;
            userContext: any;
        }): Promise<SessionContainerInterface | undefined> {
            if (
                options?.antiCsrfCheck !== false &&
                typeof config.antiCsrfFunctionOrString === "string" &&
                config.antiCsrfFunctionOrString === "VIA_CUSTOM_HEADER"
            ) {
                throw new Error(
                    "Since the anti-csrf mode is VIA_CUSTOM_HEADER getSession can't check the CSRF token. Please either use VIA_TOKEN or set antiCsrfCheck to false"
                );
            }
            logDebugMessage("getSession: Started");
            if (accessTokenString === undefined) {
                if (options?.sessionRequired === false) {
                    logDebugMessage(
                        "getSession: returning undefined because accessToken is undefined and sessionRequired is false"
                    );
                    // there is no session that exists here, and the user wants session verification
                    // to be optional. So we return undefined.
                    return undefined;
                }

                logDebugMessage("getSession: UNAUTHORISED because accessToken in request is undefined");
                throw new SessionError({
                    message:
                        "Session does not exist. Are you sending the session tokens in the request with the appropriate token transfer method?",
                    type: SessionError.UNAUTHORISED,
                    payload: {
                        // we do not clear the session here because of a
                        // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                        clearTokens: false,
                    },
                });
            }

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
                logDebugMessage(
                    "getSession: UNAUTHORISED because the accessToken couldn't be parsed or had an invalid structure"
                );
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
                userContext
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
                response.session.recipeUserId,
                payload,
                undefined,
                response.accessToken !== undefined,
                response.session.tenantId
            );

            return session;
        },

        validateClaims: async function (
            this: RecipeInterface,
            input: {
                userId: string;
                recipeUserId: RecipeUserId;
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
                    const value = await validator.claim.fetchValue(
                        input.userId,
                        input.recipeUserId,
                        accessTokenPayload.tId === undefined ? DEFAULT_TENANT_ID : accessTokenPayload.tId,
                        input.userContext
                    );
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

        getSessionInformation: async function ({
            sessionHandle,
            userContext,
        }: {
            sessionHandle: string;
            userContext: any;
        }): Promise<SessionInformation | undefined> {
            return SessionFunctions.getSessionInformation(helpers, sessionHandle, userContext);
        },

        refreshSession: async function (
            this: RecipeInterface,
            {
                refreshToken,
                antiCsrfToken,
                disableAntiCsrf,
                userContext,
            }: { refreshToken: string; antiCsrfToken?: string; disableAntiCsrf: boolean; userContext: any }
        ): Promise<SessionContainerInterface> {
            if (
                disableAntiCsrf !== true &&
                typeof config.antiCsrfFunctionOrString === "string" &&
                config.antiCsrfFunctionOrString === "VIA_CUSTOM_HEADER"
            ) {
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
                userContext
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
                response.session.recipeUserId,
                payload,
                undefined,
                true,
                payload.tId
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
                      recipeUserId: RecipeUserId;
                      userDataInJWT: any;
                      tenantId: string;
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

            let response = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/session/regenerate"),
                {
                    accessToken: input.accessToken,
                    userDataInJWT: newAccessTokenPayload,
                },
                input.userContext
            );
            if (response.status === "UNAUTHORISED") {
                return undefined;
            }
            return {
                status: response.status,
                session: {
                    handle: response.session.handle,
                    userId: response.session.userId,
                    recipeUserId: new RecipeUserId(response.session.recipeUserId),
                    userDataInJWT: response.session.userDataInJWT,
                    tenantId: response.session.tenantId,
                },
                accessToken: response.accessToken,
            };
        },

        revokeAllSessionsForUser: function ({
            userId,
            tenantId,
            revokeAcrossAllTenants,
            revokeSessionsForLinkedAccounts,
            userContext,
        }: {
            userId: string;
            revokeSessionsForLinkedAccounts: boolean;
            tenantId?: string;
            revokeAcrossAllTenants?: boolean;
            userContext: any;
        }) {
            return SessionFunctions.revokeAllSessionsForUser(
                helpers,
                userId,
                revokeSessionsForLinkedAccounts,
                tenantId,
                revokeAcrossAllTenants,
                userContext
            );
        },

        getAllSessionHandlesForUser: function ({
            userId,
            fetchSessionsForAllLinkedAccounts,
            tenantId,
            fetchAcrossAllTenants,
            userContext,
        }: {
            userId: string;
            fetchSessionsForAllLinkedAccounts: boolean;
            tenantId?: string;
            fetchAcrossAllTenants?: boolean;
            userContext: any;
        }): Promise<string[]> {
            return SessionFunctions.getAllSessionHandlesForUser(
                helpers,
                userId,
                fetchSessionsForAllLinkedAccounts,
                tenantId,
                fetchAcrossAllTenants,
                userContext
            );
        },

        revokeSession: function ({
            sessionHandle,
            userContext,
        }: {
            sessionHandle: string;
            userContext: any;
        }): Promise<boolean> {
            return SessionFunctions.revokeSession(helpers, sessionHandle, userContext);
        },

        revokeMultipleSessions: function ({
            sessionHandles,
            userContext,
        }: {
            sessionHandles: string[];
            userContext: any;
        }) {
            return SessionFunctions.revokeMultipleSessions(helpers, sessionHandles, userContext);
        },

        updateSessionDataInDatabase: function ({
            sessionHandle,
            newSessionData,
            userContext,
        }: {
            sessionHandle: string;
            newSessionData: any;
            userContext: any;
        }): Promise<boolean> {
            return SessionFunctions.updateSessionDataInDatabase(helpers, sessionHandle, newSessionData, userContext);
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

            return SessionFunctions.updateAccessTokenPayload(
                helpers,
                sessionHandle,
                newAccessTokenPayload,
                userContext
            );
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
            const accessTokenPayloadUpdate = await input.claim.build(
                sessionInfo.userId,
                sessionInfo.recipeUserId,
                sessionInfo.tenantId,
                input.userContext
            );

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
