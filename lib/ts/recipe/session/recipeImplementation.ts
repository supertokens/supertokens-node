import { RecipeInterface, VerifySessionOptions, TypeNormalisedInput, HandshakeInfo, SessionInformation } from "./types";
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

export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    config: TypeNormalisedInput;
    handshakeInfo: HandshakeInfo | undefined = undefined;
    isInServerlessEnv: boolean;

    constructor(querier: Querier, config: TypeNormalisedInput, isInServerlessEnv: boolean) {
        this.querier = querier;
        this.config = config;
        this.isInServerlessEnv = isInServerlessEnv;

        // Solving the cold start problem
        this.getHandshakeInfo().catch((_) => {
            // ignored
        });
    }

    createNewSession = async ({
        res,
        userId,
        jwtPayload = {},
        sessionData = {},
    }: {
        res: any;
        userId: string;
        jwtPayload?: any;
        sessionData?: any;
    }): Promise<Session> => {
        if (!res.wrapperUsed) {
            res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
        }
        let response = await SessionFunctions.createNewSession(this, userId, jwtPayload, sessionData);
        attachCreateOrRefreshSessionResponseToExpressRes(this.config, res, response);
        return new Session(
            this,
            response.accessToken.token,
            response.session.handle,
            response.session.userId,
            response.session.userDataInJWT,
            res
        );
    };

    getSession = async ({
        req,
        res,
        options,
    }: {
        req: any;
        res: any;
        options?: VerifySessionOptions;
    }): Promise<Session | undefined> => {
        if (!res.wrapperUsed) {
            res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
        }
        if (!req.wrapperUsed) {
            req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req);
        }
        let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;

        let idRefreshToken = getIdRefreshTokenFromCookie(req);
        if (idRefreshToken === undefined) {
            // we do not clear cookies here because of a
            // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17

            if (options !== undefined && typeof options !== "boolean" && options.sessionRequired === false) {
                // there is no session that exists here, and the user wants session verification
                // to be optional. So we return undefined.
                return undefined;
            }

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

            let response = await SessionFunctions.getSession(
                this,
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
                attachAccessTokenToCookie(this.config, res, response.accessToken.token, response.accessToken.expiry);
                accessToken = response.accessToken.token;
            }
            return new Session(
                this,
                accessToken,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                res
            );
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.config, res);
            }
            throw err;
        }
    };

    getSessionInformation = async ({ sessionHandle }: { sessionHandle: string }): Promise<SessionInformation> => {
        return SessionFunctions.getSessionInformation(this, sessionHandle);
    };

    refreshSession = async ({ req, res }: { req: any; res: any }): Promise<Session> => {
        if (!res.wrapperUsed) {
            res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
        }
        if (!req.wrapperUsed) {
            req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req);
        }
        let inputIdRefreshToken = getIdRefreshTokenFromCookie(req);
        if (inputIdRefreshToken === undefined) {
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
                throw new STError({
                    message: "Refresh token not found. Are you sending the refresh token in the request as a cookie?",
                    type: STError.UNAUTHORISED,
                });
            }
            let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
            let response = await SessionFunctions.refreshSession(
                this,
                inputRefreshToken,
                antiCsrfToken,
                getRidFromHeader(req) !== undefined
            );
            attachCreateOrRefreshSessionResponseToExpressRes(this.config, res, response);
            return new Session(
                this,
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
                clearSessionFromCookie(this.config, res);
            }
            throw err;
        }
    };

    revokeAllSessionsForUser = ({ userId }: { userId: string }) => {
        return SessionFunctions.revokeAllSessionsForUser(this, userId);
    };

    getAllSessionHandlesForUser = ({ userId }: { userId: string }): Promise<string[]> => {
        return SessionFunctions.getAllSessionHandlesForUser(this, userId);
    };

    revokeSession = ({ sessionHandle }: { sessionHandle: string }): Promise<boolean> => {
        return SessionFunctions.revokeSession(this, sessionHandle);
    };

    revokeMultipleSessions = ({ sessionHandles }: { sessionHandles: string[] }) => {
        return SessionFunctions.revokeMultipleSessions(this, sessionHandles);
    };

    getSessionData = ({ sessionHandle }: { sessionHandle: string }): Promise<any> => {
        return SessionFunctions.getSessionData(this, sessionHandle);
    };

    updateSessionData = ({ sessionHandle, newSessionData }: { sessionHandle: string; newSessionData: any }) => {
        return SessionFunctions.updateSessionData(this, sessionHandle, newSessionData);
    };

    getJWTPayload = ({ sessionHandle }: { sessionHandle: string }): Promise<any> => {
        return SessionFunctions.getJWTPayload(this, sessionHandle);
    };

    updateJWTPayload = ({ sessionHandle, newJWTPayload }: { sessionHandle: string; newJWTPayload: any }) => {
        return SessionFunctions.updateJWTPayload(this, sessionHandle, newJWTPayload);
    };

    getHandshakeInfo = async (forceRefetch = false): Promise<HandshakeInfo> => {
        if (this.handshakeInfo === undefined || forceRefetch) {
            let antiCsrf = this.config.antiCsrf;
            ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_GET_HANDSHAKE_INFO);
            let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/handshake"), {});
            let signingKeyLastUpdated = Date.now();
            if (this.handshakeInfo !== undefined) {
                if (
                    response.jwtSigningPublicKeyExpiryTime === this.handshakeInfo.jwtSigningPublicKeyExpiryTime &&
                    response.jwtSigningPublicKey === this.handshakeInfo.jwtSigningPublicKey
                ) {
                    signingKeyLastUpdated = this.handshakeInfo.signingKeyLastUpdated;
                }
            }
            this.handshakeInfo = {
                signingKeyLastUpdated,
                jwtSigningPublicKey: response.jwtSigningPublicKey,
                antiCsrf,
                accessTokenBlacklistingEnabled: response.accessTokenBlacklistingEnabled,
                jwtSigningPublicKeyExpiryTime: response.jwtSigningPublicKeyExpiryTime,
                accessTokenValidity: response.accessTokenValidity,
                refreshTokenValidity: response.refreshTokenValidity,
            };
        }
        return this.handshakeInfo;
    };

    updateJwtSigningPublicKeyInfo = (newKey: string, newExpiry: number) => {
        if (this.handshakeInfo !== undefined) {
            if (
                this.handshakeInfo.jwtSigningPublicKeyExpiryTime !== newExpiry ||
                this.handshakeInfo.jwtSigningPublicKey !== newKey
            ) {
                this.handshakeInfo.signingKeyLastUpdated = Date.now();
            }
            this.handshakeInfo.jwtSigningPublicKey = newKey;
            this.handshakeInfo.jwtSigningPublicKeyExpiryTime = newExpiry;
        }
    };

    getAccessTokenLifeTimeMS = async (): Promise<number> => {
        return (await this.getHandshakeInfo()).accessTokenValidity;
    };

    getRefreshTokenLifeTimeMS = async (): Promise<number> => {
        return (await this.getHandshakeInfo()).refreshTokenValidity;
    };
}
