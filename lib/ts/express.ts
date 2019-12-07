import * as express from "express";

import {
    attachAccessTokenToCookie,
    attachRefreshTokenToCookie,
    clearSessionFromCookie,
    getAccessTokenFromCookie,
    getAntiCsrfTokenFromHeaders,
    getRefreshTokenFromCookie,
    saveFrontendInfoFromRequest,
    setAntiCsrfTokenInHeaders,
    setIdRefreshTokenInHeader,
    setOptionsAPIHeader
} from "./cookieAndHeaders";
import { AuthError, generateError } from "./error";
import { HandshakeInfo } from "./handshakeInfo";
import * as SessionFunctions from "./session";
import { TypeInput } from "./types";

/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * Please create a database in your mongo instance before calling this function
 * @param config
 * @param client: mongo client. Default is undefined. If you provide this, please make sure that it is already connected to the right database that has the auth collections. If you do not provide this, then the library will manage its own connection.
 * @throws AuthError GENERAL_ERROR in case anything fails.
 */
export function init(hosts: TypeInput) {
    SessionFunctions.init(hosts);
}

/**
 * @description call this to "login" a user. This overwrites any existing session that exists.
 * To check if a session exists, call getSession function.
 * @throws GENERAL_ERROR in case anything fails.
 * @sideEffect sets cookies in res
 */
export async function createNewSession(
    res: express.Response,
    userId: string,
    jwtPayload: any = {},
    sessionData: any = {}
): Promise<Session> {
    let response = await SessionFunctions.createNewSession(userId, jwtPayload, sessionData);

    // attach tokens to cookies
    let accessToken = response.accessToken;
    let refreshToken = response.refreshToken;
    let idRefreshToken = response.idRefreshToken;
    attachAccessTokenToCookie(
        res,
        accessToken.token,
        accessToken.expiry,
        accessToken.domain,
        accessToken.cookiePath,
        accessToken.cookieSecure
    );
    attachRefreshTokenToCookie(
        res,
        refreshToken.token,
        refreshToken.expiry,
        refreshToken.domain,
        refreshToken.cookiePath,
        refreshToken.cookieSecure
    );
    setIdRefreshTokenInHeader(res, idRefreshToken.token, idRefreshToken.expiry);
    if (response.antiCsrfToken !== undefined) {
        setAntiCsrfTokenInHeaders(res, response.antiCsrfToken);
    }

    return new Session(response.session.handle, response.session.userId, response.session.userDataInJWT, res);
}

/**
 * @description authenticates a session. To be used in APIs that require authentication
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED and TRY_REFRESH_TOKEN
 * @sideEffects may remove cookies, or change the accessToken.
 */
export async function getSession(
    req: express.Request,
    res: express.Response,
    doAntiCsrfCheck: boolean
): Promise<Session> {
    saveFrontendInfoFromRequest(req);
    let accessToken = getAccessTokenFromCookie(req);
    if (accessToken === undefined) {
        // maybe the access token has expired.
        throw generateError(AuthError.TRY_REFRESH_TOKEN, new Error("access token missing in cookies"));
    }
    try {
        let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
        let response = await SessionFunctions.getSession(accessToken, antiCsrfToken, doAntiCsrfCheck);
        if (response.accessToken !== undefined) {
            attachAccessTokenToCookie(
                res,
                response.accessToken.token,
                response.accessToken.expiry,
                response.accessToken.domain,
                response.accessToken.cookiePath,
                response.accessToken.cookieSecure
            );
        }
        return new Session(response.session.handle, response.session.userId, response.session.userDataInJWT, res);
    } catch (err) {
        if (AuthError.isErrorFromAuth(err) && err.errType === AuthError.UNAUTHORISED) {
            let handShakeInfo = await HandshakeInfo.getInstance();
            clearSessionFromCookie(
                res,
                handShakeInfo.cookieDomain,
                handShakeInfo.cookieSecure,
                handShakeInfo.accessTokenPath,
                handShakeInfo.refreshTokenPath
            );
        }
        throw err;
    }
}

/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 * @sideEffects may remove cookies, or change the accessToken and refreshToken.
 */
export async function refreshSession(req: express.Request, res: express.Response): Promise<Session> {
    saveFrontendInfoFromRequest(req);
    let inputRefreshToken = getRefreshTokenFromCookie(req);
    if (inputRefreshToken === undefined) {
        let handShakeInfo = await HandshakeInfo.getInstance();
        clearSessionFromCookie(
            res,
            handShakeInfo.cookieDomain,
            handShakeInfo.cookieSecure,
            handShakeInfo.accessTokenPath,
            handShakeInfo.refreshTokenPath
        );
        throw generateError(AuthError.UNAUTHORISED, new Error("missing auth tokens in cookies"));
    }

    try {
        let response = await SessionFunctions.refreshSession(inputRefreshToken);
        // attach tokens to cookies
        let accessToken = response.accessToken;
        let refreshToken = response.refreshToken;
        let idRefreshToken = response.idRefreshToken;
        attachAccessTokenToCookie(
            res,
            accessToken.token,
            accessToken.expiry,
            accessToken.domain,
            accessToken.cookiePath,
            accessToken.cookieSecure
        );
        attachRefreshTokenToCookie(
            res,
            refreshToken.token,
            refreshToken.expiry,
            refreshToken.domain,
            refreshToken.cookiePath,
            refreshToken.cookieSecure
        );
        setIdRefreshTokenInHeader(res, idRefreshToken.token, idRefreshToken.expiry);
        if (response.antiCsrfToken !== undefined) {
            setAntiCsrfTokenInHeaders(res, response.antiCsrfToken);
        }

        return new Session(response.session.handle, response.session.userId, response.session.userDataInJWT, res);
    } catch (err) {
        if (
            AuthError.isErrorFromAuth(err) &&
            (err.errType === AuthError.UNAUTHORISED || err.errType === AuthError.TOKEN_THEFT_DETECTED)
        ) {
            let handShakeInfo = await HandshakeInfo.getInstance();
            clearSessionFromCookie(
                res,
                handShakeInfo.cookieDomain,
                handShakeInfo.cookieSecure,
                handShakeInfo.accessTokenPath,
                handShakeInfo.refreshTokenPath
            );
        }
        throw err;
    }
}

/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated, unless we enable a blacklisting. Or changed the private key to sign them.
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeAllSessionsForUser(userId: string) {
    return SessionFunctions.revokeAllSessionsForUser(userId);
}

/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
export async function getAllSessionHandlesForUser(userId: string): Promise<string[]> {
    return SessionFunctions.getAllSessionHandlesForUser(userId);
}

/**
 * @description call to destroy one session. This will not clear cookies, so if you have a Session object, please use that.
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeSessionUsingSessionHandle(sessionHandle: string): Promise<boolean> {
    return SessionFunctions.revokeSessionUsingSessionHandle(sessionHandle);
}

/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself. If you have a Session object, please use that instead.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function getSessionData(sessionHandle: string): Promise<any> {
    return SessionFunctions.getSessionData(sessionHandle);
}

/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well. If you have a Session object, please use that instead.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function updateSessionData(sessionHandle: string, newSessionData: any) {
    return SessionFunctions.updateSessionData(sessionHandle, newSessionData);
}

/**
 * @description Sets relevant Access-Control-Allow-Headers and Access-Control-Allow-Credentials headers
 */
export async function setRelevantHeadersForOptionsAPI(res: express.Response) {
    setOptionsAPIHeader(res);
}

/**
 * @class Session
 * @description an instance of this is created when a session is valid.
 */
export class Session {
    private sessionHandle: string;
    private userId: string;
    private userDataInJWT: any;
    private res: express.Response;

    constructor(sessionHandle: string, userId: string, userDataInJWT: any, res: express.Response) {
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInJWT = userDataInJWT;
        this.res = res;
    }

    /**
     * @description call this to logout the current user.
     * This only invalidates the refresh token. The access token can still be used after
     * @sideEffect may clear cookies from response.
     * @throw AuthError GENERAL_ERROR
     */
    revokeSession = async () => {
        if (await SessionFunctions.revokeSessionUsingSessionHandle(this.sessionHandle)) {
            let handShakeInfo = await HandshakeInfo.getInstance();
            clearSessionFromCookie(
                this.res,
                handShakeInfo.cookieDomain,
                handShakeInfo.cookieSecure,
                handShakeInfo.accessTokenPath,
                handShakeInfo.refreshTokenPath
            );
        }
    };

    /**
     * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
     * @returns session data as provided by the user earlier
     * @sideEffect may clear cookies from response.
     * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
     */
    getSessionData = async (): Promise<any> => {
        try {
            return await SessionFunctions.getSessionData(this.sessionHandle);
        } catch (err) {
            if (AuthError.isErrorFromAuth(err) && err.errType === AuthError.UNAUTHORISED) {
                let handShakeInfo = await HandshakeInfo.getInstance();
                clearSessionFromCookie(
                    this.res,
                    handShakeInfo.cookieDomain,
                    handShakeInfo.cookieSecure,
                    handShakeInfo.accessTokenPath,
                    handShakeInfo.refreshTokenPath
                );
            }
            throw err;
        }
    };

    /**
     * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
     * @sideEffect may clear cookies from response.
     * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
     */
    updateSessionData = async (newSessionData: any) => {
        try {
            await SessionFunctions.updateSessionData(this.sessionHandle, newSessionData);
        } catch (err) {
            if (AuthError.isErrorFromAuth(err) && err.errType === AuthError.UNAUTHORISED) {
                let handShakeInfo = await HandshakeInfo.getInstance();
                clearSessionFromCookie(
                    this.res,
                    handShakeInfo.cookieDomain,
                    handShakeInfo.cookieSecure,
                    handShakeInfo.accessTokenPath,
                    handShakeInfo.refreshTokenPath
                );
            }
            throw err;
        }
    };

    getUserId = () => {
        return this.userId;
    };

    getJWTPayload = () => {
        return this.userDataInJWT;
    };
}
