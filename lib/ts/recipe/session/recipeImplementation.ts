import {
    RecipeInterface,
    VerifySessionOptions,
    TypeNormalisedInput,
    SessionInformation,
    KeyInfo,
    AntiCsrfType,
    SessionClaimValidator,
    SessionClaim,
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
import { attachCreateOrRefreshSessionResponseToExpressRes } from "./utils";
import Session from "./sessionClass";
import STError from "./error";
import { normaliseHttpMethod, frontendHasInterceptor } from "../../utils";
import { Querier } from "../../querier";
import { PROCESS_STATE, ProcessState } from "../../processState";
import NormalisedURLPath from "../../normalisedURLPath";
import SuperTokens from "../../supertokens";
import frameworks from "../../framework";
import { JSONObject } from "../../types";
import { logDebugMessage } from "../../logger";
import SessionRecipe from "./recipe";

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

    let obj = {
        createNewSession: async function ({
            res,
            userId,
            accessTokenPayload = {},
            sessionData = {},
        }: {
            res: any;
            userId: string;
            accessTokenPayload?: any;
            sessionData?: any;
            userContext: any;
        }): Promise<Session> {
            if (!res.wrapperUsed) {
                res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
            }
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

        getGlobalClaimValidators: async function (input: { defaultClaimValidators: SessionClaimValidator[] }) {
            return input.defaultClaimValidators;
        },

        getSession: async function ({
            req,
            res,
            options,
            userContext,
        }: {
            req: any;
            res: any;
            options?: VerifySessionOptions;
            userContext: any;
        }): Promise<Session | undefined> {
            logDebugMessage("getSession: Started");
            if (!res.wrapperUsed) {
                res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
            }
            if (!req.wrapperUsed) {
                req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req);
            }
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

                const defaultClaimValidators = SessionRecipe.getInstanceOrThrowError().getDefaultClaimValidators();
                const globalClaimValidators: SessionClaimValidator[] = await this.getGlobalClaimValidators({
                    userId: response.session.userId,
                    defaultClaimValidators,
                    userContext,
                });
                const reqClaimsValidators =
                    options?.overrideGlobalClaimValidators !== undefined
                        ? await options.overrideGlobalClaimValidators(session, globalClaimValidators, userContext)
                        : globalClaimValidators;

                logDebugMessage(
                    "getSession: required validatorTypeIds " +
                        reqClaimsValidators.map((c) => c.validatorTypeId).join(", ")
                );
                await session.assertClaims(reqClaimsValidators, userContext);

                return session;
            } catch (err) {
                if (err.type === STError.UNAUTHORISED) {
                    logDebugMessage("getSession: Clearing cookies because of UNAUTHORISED response");
                    clearSessionFromCookie(config, res);
                }
                throw err;
            }
        },

        getSessionInformation: async function ({
            sessionHandle,
        }: {
            sessionHandle: string;
        }): Promise<SessionInformation> {
            return SessionFunctions.getSessionInformation(helpers, sessionHandle);
        },

        refreshSession: async function ({ req, res }: { req: any; res: any }): Promise<Session> {
            logDebugMessage("refreshSession: Started");
            if (!res.wrapperUsed) {
                res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
            }
            if (!req.wrapperUsed) {
                req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req);
            }
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
        ): Promise<{
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
        }> {
            let newAccessTokenPayload =
                input.newAccessTokenPayload === null || input.newAccessTokenPayload === undefined
                    ? {}
                    : input.newAccessTokenPayload;
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/session/regenerate"), {
                accessToken: input.accessToken,
                userDataInJWT: newAccessTokenPayload,
            });
            if (response.status === "UNAUTHORISED") {
                throw new STError({
                    message: response.message,
                    type: STError.UNAUTHORISED,
                });
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
        }) {
            return SessionFunctions.updateSessionData(helpers, sessionHandle, newSessionData);
        },

        updateAccessTokenPayload: function ({
            sessionHandle,
            newAccessTokenPayload,
        }: {
            sessionHandle: string;
            newAccessTokenPayload: any;
        }) {
            return SessionFunctions.updateAccessTokenPayload(helpers, sessionHandle, newAccessTokenPayload);
        },

        mergeIntoAccessTokenPayload: async function ({
            sessionHandle,
            accessTokenPayloadUpdate,
        }: {
            sessionHandle: string;
            accessTokenPayloadUpdate: JSONObject;
        }) {
            const sessionInfo = await this.getSessionInformation(helpers, sessionHandle);
            const updatedPayload = { ...sessionInfo.accessTokenPayload, ...accessTokenPayloadUpdate };
            for (const key of Object.keys(accessTokenPayloadUpdate)) {
                if (accessTokenPayloadUpdate[key] === null) {
                    delete updatedPayload[key];
                }
            }
            return this.updateAccessTokenPayload(sessionHandle, updatedPayload);
        },

        getAccessTokenLifeTimeMS: async function (): Promise<number> {
            return (await getHandshakeInfo()).accessTokenValidity;
        },

        getRefreshTokenLifeTimeMS: async function (): Promise<number> {
            return (await getHandshakeInfo()).refreshTokenValidity;
        },

        applyClaim: async function <T>(input: { sessionHandle: string; claim: SessionClaim<T>; userContext?: any }) {
            // TODO: maybe get userId from input? we are fetching session info twice :/
            const sessionInfo = await this.getSessionInformation(helpers, input.sessionHandle);
            const accessTokenPayloadUpdate = input.claim.applyToPayload(sessionInfo.userId, {}, input.userContext);
            return this.mergeIntoAccessTokenPayload({
                sessionHandle: input.sessionHandle,
                accessTokenPayloadUpdate,
                userContext: input.userContext,
            });
        },

        setClaimValue: function <T>(input: {
            sessionHandle: string;
            claim: SessionClaim<T>;
            value: T;
            userContext?: any;
        }) {
            const accessTokenPayloadUpdate = input.claim.addToPayload_internal({}, input.value, input.userContext);
            return this.mergeIntoAccessTokenPayload({
                sessionHandle: input.sessionHandle,
                accessTokenPayloadUpdate,
                userContext: input.userContext,
            });
        },

        getClaimValue: async function <T>(input: { sessionHandle: string; claim: SessionClaim<T>; userContext?: any }) {
            return input.claim.getValueFromPayload(await this.getAccessTokenPayload(), input.userContext);
        },

        removeClaim: function (input: { sessionHandle: string; claim: SessionClaim<any>; userContext?: any }) {
            const accessTokenPayloadUpdate = input.claim.removeFromPayload({}, input.userContext);
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
