import {
    RecipeInterface,
    VerifySessionOptions,
    TypeNormalisedInput,
    SessionInformation,
    KeyInfo,
    AntiCsrfType,
    SessionClaimValidator,
    SessionClaim,
    ClaimValidationError,
} from "./types";
import * as SessionFunctions from "./sessionFunctions";
import {
    clearSession,
    getAntiCsrfTokenFromHeaders,
    setFrontTokenInHeaders,
    getToken,
    setToken,
} from "./cookieAndHeaders";
import { attachCreateOrRefreshSessionResponseToExpressRes, validateClaimsInPayload } from "./utils";
import Session from "./sessionClass";
import STError from "./error";
import { normaliseHttpMethod, frontendHasInterceptor, getRidFromHeader } from "../../utils";
import { Querier } from "../../querier";
import { PROCESS_STATE, ProcessState } from "../../processState";
import NormalisedURLPath from "../../normalisedURLPath";
import { JSONObject, NormalisedAppinfo } from "../../types";
import { logDebugMessage } from "../../logger";
import { BaseResponse } from "../../framework/response";
import { BaseRequest } from "../../framework/request";

export class HandshakeInfo {
    constructor(
        public antiCsrf: AntiCsrfType,
        public accessTokenBlacklistingEnabled: boolean,
        public accessTokenValidity: number,
        public refreshTokenValidity: number,
        private rawJwtSigningPublicKeyList: KeyInfo[]
    ) {}

    setJwtSigningPublicKeyList(updatedList: KeyInfo[]) {
        this.rawJwtSigningPublicKeyList = updatedList;
    }

    getJwtSigningPublicKeyList() {
        return this.rawJwtSigningPublicKeyList.filter((key) => key.expiryTime > Date.now());
    }

    clone() {
        return new HandshakeInfo(
            this.antiCsrf,
            this.accessTokenBlacklistingEnabled,
            this.accessTokenValidity,
            this.refreshTokenValidity,
            this.rawJwtSigningPublicKeyList
        );
    }
}

export type Helpers = {
    querier: Querier;
    getHandshakeInfo: (forceRefetch?: boolean) => Promise<HandshakeInfo>;
    updateJwtSigningPublicKeyInfo: (keyList: KeyInfo[] | undefined, publicKey: string, expiryTime: number) => void;
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
    let handshakeInfo: undefined | HandshakeInfo;

    async function getHandshakeInfo(forceRefetch = false): Promise<HandshakeInfo> {
        if (handshakeInfo === undefined || handshakeInfo.getJwtSigningPublicKeyList().length === 0 || forceRefetch) {
            let antiCsrf = config.antiCsrf;
            ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_GET_HANDSHAKE_INFO);
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/handshake"), {});

            handshakeInfo = new HandshakeInfo(
                antiCsrf,
                response.accessTokenBlacklistingEnabled,
                response.accessTokenValidity,
                response.refreshTokenValidity,
                response.jwtSigningPublicKeyList
            );

            updateJwtSigningPublicKeyInfo(
                response.jwtSigningPublicKeyList,
                response.jwtSigningPublicKey,
                response.jwtSigningPublicKeyExpiryTime
            );
        }
        return handshakeInfo;
    }

    function updateJwtSigningPublicKeyInfo(keyList: KeyInfo[] | undefined, publicKey: string, expiryTime: number) {
        if (keyList === undefined) {
            // Setting createdAt to Date.now() emulates the old lastUpdatedAt logic
            keyList = [{ publicKey, expiryTime, createdAt: Date.now() }];
        }

        if (handshakeInfo !== undefined) {
            handshakeInfo.setJwtSigningPublicKeyList(keyList);
        }
    }

    let obj: RecipeInterface = {
        createNewSession: async function ({
            req,
            res,
            userId,
            accessTokenPayload = {},
            sessionData = {},
            userContext,
        }: {
            req: BaseRequest;
            res: BaseResponse;
            userId: string;
            accessTokenPayload?: any;
            sessionData?: any;
            userContext: any;
        }): Promise<Session> {
            logDebugMessage("createNewSession: Started");
            let transferMethod = config.getTokenTransferMethod({ req, userContext });
            logDebugMessage("createNewSession: got transfer method " + transferMethod);
            if (transferMethod === "MISSING_AUTH_HEADER") {
                transferMethod = "header";
            }
            logDebugMessage("createNewSession: using transfer method " + transferMethod);

            const disableAntiCSRF = transferMethod === "header";
            let response = await SessionFunctions.createNewSession(
                helpers,
                userId,
                disableAntiCSRF,
                accessTokenPayload,
                sessionData
            );
            attachCreateOrRefreshSessionResponseToExpressRes(config, res, response, transferMethod);
            return new Session(
                helpers,
                response.accessToken.token,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                res,
                req,
                transferMethod
            );
        },

        getGlobalClaimValidators: async function (input: {
            claimValidatorsAddedByOtherRecipes: SessionClaimValidator[];
        }) {
            return input.claimValidatorsAddedByOtherRecipes;
        },

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

            const sessionOptional =
                options !== undefined && typeof options !== "boolean" && options.sessionRequired === false;
            const gotRID = frontendHasInterceptor(req);
            const method = req.getMethod();

            logDebugMessage("getSession: optional validation: " + sessionOptional);
            logDebugMessage("getSession: rid in header: " + gotRID);
            logDebugMessage("getSession: request method: " + method);
            let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;
            const preferredTransferMethod = config.getTokenTransferMethod({ req, userContext });

            let transferMethod = preferredTransferMethod === "MISSING_AUTH_HEADER" ? "header" : preferredTransferMethod;

            let accessToken = getToken(req, "access", transferMethod);
            if (accessToken === undefined) {
                const fallbackMethod = transferMethod === "cookie" ? "header" : "cookie";
                // We are checking if we could've gone ahead with validation if the transferMethod was different
                // However, we don't want to do the fallback here, but force a call to refresh
                // This is done to ensure that the browsers update the transfermethod in a timely manner (basically on the next API call)
                // instead of waiting for the session to expire
                accessToken = getToken(req, "access", fallbackMethod);
                if (accessToken !== undefined) {
                    if (preferredTransferMethod === "MISSING_AUTH_HEADER") {
                        transferMethod = fallbackMethod;
                        logDebugMessage(
                            `getSession: falling back to use ${fallbackMethod} as an authentication-method`
                        );
                    } else {
                        logDebugMessage(
                            `getSession: returning TRY_REFRESH_TOKEN because preferred auth-mode doesn't allow fallback and access token was sent with the wrong method`
                        );
                        throw new STError({
                            message: "access token sent with the wrong method. Please call the refresh API",
                            type: STError.TRY_REFRESH_TOKEN,
                        });
                    }
                }
            }

            if (accessToken === undefined) {
                // This is done here to ensure smooth migration of sessions started before removing the id-refresh-token
                // This token isn't handled by getToken to limit the scope of this legacy/migration code
                if (req.getCookieValue("sIRTFrontend") !== undefined) {
                    throw new STError({
                        message: "access token expired, please call the refresh API",
                        type: STError.TRY_REFRESH_TOKEN,
                    });
                }
                // we do not clear cookies here because of a
                // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17

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
                    message: "Session does not exist. Are you sending the session tokens in the request as cookies?",
                    type: STError.UNAUTHORISED,
                });
            }

            try {
                let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
                const disableAntiCSRF = transferMethod === "header";

                if (doAntiCsrfCheck === undefined) {
                    doAntiCsrfCheck = normaliseHttpMethod(req.getMethod()) !== "get";
                }
                logDebugMessage("getSession: Value of doAntiCsrfCheck is: " + doAntiCsrfCheck);

                let response = await SessionFunctions.getSession(
                    helpers,
                    accessToken,
                    antiCsrfToken,
                    !disableAntiCSRF && doAntiCsrfCheck,
                    getRidFromHeader(req) !== undefined
                );
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
                        transferMethod
                    );
                    accessToken = response.accessToken.token;
                }
                logDebugMessage("getSession: Success!");
                const session = new Session(
                    helpers,
                    accessToken,
                    response.session.handle,
                    response.session.userId,
                    response.session.userDataInJWT,
                    res,
                    req,
                    transferMethod
                );

                return session;
            } catch (err) {
                if (err.type === STError.TRY_REFRESH_TOKEN && sessionOptional && !gotRID && method !== "get") {
                    return undefined;
                }

                if (err.type === STError.UNAUTHORISED) {
                    logDebugMessage("getSession: Clearing cookies because of UNAUTHORISED response");
                    clearSession(config, req, res, userContext);
                }
                throw err;
            }
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
            { req, res, userContext }: { req: BaseRequest; res: BaseResponse; userContext: any }
        ): Promise<Session> {
            logDebugMessage("refreshSession: Started");
            // We use a fallback mechanism here, to ensure there is a smooth upgrade path when switching transfer methods
            // We only use it here and not while getting/validating sessions, because we want to "force" clients to upgrade
            let outputTransferMethod = config.getTokenTransferMethod({ req, userContext });
            logDebugMessage("refreshSession: Preferred transfer method: " + outputTransferMethod);
            let inputTransferMethod = outputTransferMethod;

            if (inputTransferMethod === "MISSING_AUTH_HEADER") {
                inputTransferMethod = "header";
            }

            let inputRefreshToken = getToken(req, "refresh", inputTransferMethod);
            if (inputRefreshToken === undefined) {
                inputTransferMethod = inputTransferMethod === "cookie" ? "header" : "cookie";
                inputRefreshToken = getToken(req, "refresh", inputTransferMethod);
            }

            if (outputTransferMethod === "MISSING_AUTH_HEADER") {
                outputTransferMethod = inputTransferMethod;
            }

            if (inputRefreshToken === undefined) {
                logDebugMessage("refreshSession: UNAUTHORISED because refresh token in request is undefined");
                throw new STError({
                    message: "Refresh token not found. Are you sending the refresh token in the request as a cookie?",
                    type: STError.UNAUTHORISED,
                });
            }
            logDebugMessage("refreshSession: Request used transfer method: " + inputRefreshToken);

            try {
                let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
                let response = await SessionFunctions.refreshSession(
                    helpers,
                    inputRefreshToken,
                    antiCsrfToken,
                    getRidFromHeader(req) !== undefined,
                    inputTransferMethod,
                    outputTransferMethod
                );
                logDebugMessage("refreshSession: Attaching refreshed session info as " + outputTransferMethod);

                // This will get the preferred transfer method again, and intentionally not use the fallback
                // See above for the reasoning
                attachCreateOrRefreshSessionResponseToExpressRes(config, res, response, outputTransferMethod);
                logDebugMessage("refreshSession: Success!");
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
            } catch (err) {
                if (
                    (err.type === STError.UNAUTHORISED && err.payload.clearTokens) ||
                    err.type === STError.TOKEN_THEFT_DETECTED
                ) {
                    logDebugMessage(
                        "refreshSession: Clearing cookies because of UNAUTHORISED or TOKEN_THEFT_DETECTED response"
                    );
                    clearSession(config, req, res, userContext);
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

        updateAccessTokenPayload: function ({
            sessionHandle,
            newAccessTokenPayload,
        }: {
            sessionHandle: string;
            newAccessTokenPayload: any;
        }): Promise<boolean> {
            return SessionFunctions.updateAccessTokenPayload(helpers, sessionHandle, newAccessTokenPayload);
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
            return this.updateAccessTokenPayload({ sessionHandle, newAccessTokenPayload, userContext });
        },

        getAccessTokenLifeTimeMS: async function (): Promise<number> {
            return (await getHandshakeInfo()).accessTokenValidity;
        },

        getRefreshTokenLifeTimeMS: async function (): Promise<number> {
            return (await getHandshakeInfo()).refreshTokenValidity;
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
        updateJwtSigningPublicKeyInfo,
        getHandshakeInfo,
        config,
        appInfo,
        getRecipeImpl: getRecipeImplAfterOverrides,
    };

    if (process.env.TEST_MODE === "testing") {
        // testing mode, we add some of the help functions to the obj
        (obj as any).getHandshakeInfo = getHandshakeInfo;
        (obj as any).updateJwtSigningPublicKeyInfo = updateJwtSigningPublicKeyInfo;
        (obj as any).helpers = helpers;
        (obj as any).setHandshakeInfo = function (info: any) {
            handshakeInfo = info;
        };
    }

    return obj;
}
