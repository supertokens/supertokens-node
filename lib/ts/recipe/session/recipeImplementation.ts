import {
    RecipeInterface,
    VerifySessionOptions,
    TypeNormalisedInput,
    SessionInformation,
    KeyInfo,
    AntiCsrfType,
    SessionClaimValidator,
    SessionClaim,
    SessionContainerInterface,
    ClaimValidationError,
} from "./types";
import * as SessionFunctions from "./sessionFunctions";
import {
    attachAccessTokenToCookie,
    clearSessionFromCookie,
    getAccessTokenFromCookie,
    getAntiCsrfTokenFromHeaders,
    getIdRefreshTokenFromCookie,
    getRefreshTokenFromCookie,
    setFrontTokenInHeaders,
    getRidFromHeader,
} from "./cookieAndHeaders";
import {
    attachCreateOrRefreshSessionResponseToExpressRes,
    updateClaimsInPayloadIfNeeded,
    validateClaimsInPayload,
} from "./utils";
import Session from "./sessionClass";
import STError from "./error";
import { normaliseHttpMethod, frontendHasInterceptor } from "../../utils";
import { Querier } from "../../querier";
import { PROCESS_STATE, ProcessState } from "../../processState";
import NormalisedURLPath from "../../normalisedURLPath";
import { JSONObject } from "../../types";
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
    sessionRecipeImpl: RecipeInterface;
};

export default function getRecipeInterface(querier: Querier, config: TypeNormalisedInput): RecipeInterface {
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
            res,
            userId,
            accessTokenPayload = {},
            sessionData = {},
        }: {
            res: BaseResponse;
            userId: string;
            accessTokenPayload?: any;
            sessionData?: any;
            userContext: any;
        }): Promise<Session> {
            let response = await SessionFunctions.createNewSession(helpers, userId, accessTokenPayload, sessionData);
            attachCreateOrRefreshSessionResponseToExpressRes(config, res, response);
            return new Session(
                helpers,
                response.accessToken.token,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                res
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
        }: {
            req: BaseRequest;
            res: BaseResponse;
            options?: VerifySessionOptions;
            userContext: any;
        }): Promise<Session | undefined> {
            logDebugMessage("getSession: Started");
            logDebugMessage("getSession: rid in header: " + frontendHasInterceptor(req));
            logDebugMessage("getSession: request method: " + req.getMethod());
            let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;

            let idRefreshToken = getIdRefreshTokenFromCookie(req);
            if (idRefreshToken === undefined) {
                // we do not clear cookies here because of a
                // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17

                if (options !== undefined && typeof options !== "boolean" && options.sessionRequired === false) {
                    logDebugMessage(
                        "getSession: returning undefined because idRefreshToken is undefined and sessionRequired is false"
                    );
                    // there is no session that exists here, and the user wants session verification
                    // to be optional. So we return undefined.
                    return undefined;
                }

                logDebugMessage("getSession: UNAUTHORISED because idRefreshToken from cookies is undefined");
                throw new STError({
                    message: "Session does not exist. Are you sending the session tokens in the request as cookies?",
                    type: STError.UNAUTHORISED,
                });
            }
            let accessToken = getAccessTokenFromCookie(req);
            if (accessToken === undefined) {
                // maybe the access token has expired.
                /**
                 * Based on issue: #156 (spertokens-node)
                 * we throw TRY_REFRESH_TOKEN only if
                 * options.sessionRequired === true || (frontendHasInterceptor or request method is get),
                 * else we should return undefined
                 */
                if (
                    options === undefined ||
                    (options !== undefined && options.sessionRequired === true) ||
                    frontendHasInterceptor(req) ||
                    normaliseHttpMethod(req.getMethod()) === "get"
                ) {
                    logDebugMessage(
                        "getSession: Returning try refresh token because access token from cookies is undefined"
                    );
                    throw new STError({
                        message: "Access token has expired. Please call the refresh API",
                        type: STError.TRY_REFRESH_TOKEN,
                    });
                }
                return undefined;
            }
            try {
                let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);

                if (doAntiCsrfCheck === undefined) {
                    doAntiCsrfCheck = normaliseHttpMethod(req.getMethod()) !== "get";
                }
                logDebugMessage("getSession: Value of doAntiCsrfCheck is: " + doAntiCsrfCheck);

                let response = await SessionFunctions.getSession(
                    helpers,
                    accessToken,
                    antiCsrfToken,
                    doAntiCsrfCheck,
                    getRidFromHeader(req) !== undefined
                );
                if (response.accessToken !== undefined) {
                    setFrontTokenInHeaders(
                        res,
                        response.session.userId,
                        response.accessToken.expiry,
                        response.session.userDataInJWT
                    );
                    attachAccessTokenToCookie(config, res, response.accessToken.token, response.accessToken.expiry);
                    accessToken = response.accessToken.token;
                }
                logDebugMessage("getSession: Success!");
                const session = new Session(
                    helpers,
                    accessToken,
                    response.session.handle,
                    response.session.userId,
                    response.session.userDataInJWT,
                    res
                );

                return session;
            } catch (err) {
                if (err.type === STError.UNAUTHORISED) {
                    logDebugMessage("getSession: Clearing cookies because of UNAUTHORISED response");
                    clearSessionFromCookie(config, res);
                }
                throw err;
            }
        },

        assertClaims: async function (
            this: RecipeInterface,
            input: {
                session: SessionContainerInterface;

                claimValidators: SessionClaimValidator[];
                userContext?: any;
            }
        ): Promise<void> {
            logDebugMessage("getSession: required validator ids " + input.claimValidators.map((c) => c.id).join(", "));
            await input.session.assertClaims(input.claimValidators, input.userContext);
            logDebugMessage("getSession: claim assertion successful");
        },

        validateClaimsForSessionHandle: async function (
            this: RecipeInterface,
            input: {
                sessionInfo: SessionInformation;
                claimValidators: SessionClaimValidator[];
                userContext: any;
            }
        ): Promise<
            | {
                  status: "SESSION_DOES_NOT_EXIST_ERROR";
              }
            | {
                  status: "OK";
                  invalidClaims: ClaimValidationError[];
              }
        > {
            const origSessionClaimPayloadJSON = JSON.stringify(input.sessionInfo.accessTokenPayload);

            let newAccessTokenPayload = await updateClaimsInPayloadIfNeeded(
                input.claimValidators,
                input.sessionInfo.accessTokenPayload,
                input.userContext
            );

            if (JSON.stringify(newAccessTokenPayload) !== origSessionClaimPayloadJSON) {
                await this.mergeIntoAccessTokenPayload({
                    accessTokenPayloadUpdate: newAccessTokenPayload,
                    sessionHandle: input.sessionInfo.sessionHandle,
                    userContext: input.userContext,
                });
            }

            const invalidClaims = await validateClaimsInPayload(
                input.claimValidators,
                newAccessTokenPayload,
                input.userContext
            );

            return {
                status: "OK",
                invalidClaims,
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
            { req, res }: { req: BaseRequest; res: BaseResponse }
        ): Promise<Session> {
            logDebugMessage("refreshSession: Started");
            let inputIdRefreshToken = getIdRefreshTokenFromCookie(req);
            if (inputIdRefreshToken === undefined) {
                logDebugMessage("refreshSession: UNAUTHORISED because idRefreshToken from cookies is undefined");
                // we do not clear cookies here because of a
                // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17

                throw new STError({
                    message: "Session does not exist. Are you sending the session tokens in the request as cookies?",
                    type: STError.UNAUTHORISED,
                });
            }

            try {
                let inputRefreshToken = getRefreshTokenFromCookie(req);
                if (inputRefreshToken === undefined) {
                    logDebugMessage("refreshSession: UNAUTHORISED because refresh token from cookies is undefined");
                    throw new STError({
                        message:
                            "Refresh token not found. Are you sending the refresh token in the request as a cookie?",
                        type: STError.UNAUTHORISED,
                    });
                }
                let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
                let response = await SessionFunctions.refreshSession(
                    helpers,
                    inputRefreshToken,
                    antiCsrfToken,
                    getRidFromHeader(req) !== undefined
                );
                attachCreateOrRefreshSessionResponseToExpressRes(config, res, response);
                logDebugMessage("refreshSession: Success!");
                return new Session(
                    helpers,
                    response.accessToken.token,
                    response.session.handle,
                    response.session.userId,
                    response.session.userDataInJWT,
                    res
                );
            } catch (err) {
                if (
                    (err.type === STError.UNAUTHORISED && err.payload.clearCookies) ||
                    err.type === STError.TOKEN_THEFT_DETECTED
                ) {
                    logDebugMessage(
                        "refreshSession: Clearing cookies because of UNAUTHORISED or TOKEN_THEFT_DETECTED response"
                    );
                    clearSessionFromCookie(config, res);
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
        sessionRecipeImpl: obj,
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
