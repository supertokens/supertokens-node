/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
import * as express from "express";

import {
    attachAccessTokenToCookie,
    attachRefreshTokenToCookie,
    clearSessionFromCookie,
    getAccessTokenFromCookie,
    getAntiCsrfTokenFromHeaders,
    getIdRefreshTokenFromCookie,
    getRefreshTokenFromCookie,
    saveFrontendInfoFromRequest,
    setAntiCsrfTokenInHeaders,
    setIdRefreshTokenInHeaderAndCookie,
    setOptionsAPIHeader,
} from "./cookieAndHeaders";
import { AuthError, generateError } from "./error";
import { HandshakeInfo } from "./handshakeInfo";
import * as SessionFunctions from "./session";
import { TypeInput } from "./types";
import { Querier } from "./querier";

// TODO: Make it also work with PassportJS

/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * Please create a database in your mongo instance before calling this function
 * @param config
 * @param client: mongo client. Default is undefined. If you provide this, please make sure that it is already connected to the right database that has the auth collections. If you do not provide this, then the library will manage its own connection.
 * @throws AuthError GENERAL_ERROR in case anything fails.
 */
export function init(config: TypeInput) {
    SessionFunctions.init(config);
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
        accessToken.cookieSecure,
        accessToken.sameSite
    );
    attachRefreshTokenToCookie(
        res,
        refreshToken.token,
        refreshToken.expiry,
        refreshToken.domain,
        refreshToken.cookiePath,
        refreshToken.cookieSecure,
        refreshToken.sameSite
    );
    setIdRefreshTokenInHeaderAndCookie(
        res,
        idRefreshToken.token,
        idRefreshToken.expiry,
        idRefreshToken.domain,
        idRefreshToken.cookieSecure,
        idRefreshToken.cookiePath,
        idRefreshToken.sameSite
    );
    if (response.antiCsrfToken !== undefined) {
        setAntiCsrfTokenInHeaders(res, response.antiCsrfToken);
    }

    return new Session(
        accessToken.token,
        response.session.handle,
        response.session.userId,
        response.session.userDataInJWT,
        res
    );
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
    let idRefreshToken = getIdRefreshTokenFromCookie(req);
    if (idRefreshToken === undefined) {
        throw generateError(AuthError.UNAUTHORISED, new Error("idRefreshToken missing"));
    }
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
                response.accessToken.cookieSecure,
                response.accessToken.sameSite
            );
            accessToken = response.accessToken.token;
        }
        return new Session(
            accessToken,
            response.session.handle,
            response.session.userId,
            response.session.userDataInJWT,
            res
        );
    } catch (err) {
        if (AuthError.isErrorFromAuth(err) && err.errType === AuthError.UNAUTHORISED) {
            let handShakeInfo = await HandshakeInfo.getInstance();
            clearSessionFromCookie(
                res,
                handShakeInfo.cookieDomain,
                handShakeInfo.cookieSecure,
                handShakeInfo.accessTokenPath,
                handShakeInfo.refreshTokenPath,
                handShakeInfo.idRefreshTokenPath,
                handShakeInfo.cookieSameSite
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
            handShakeInfo.refreshTokenPath,
            handShakeInfo.idRefreshTokenPath,
            handShakeInfo.cookieSameSite
        );
        throw generateError(
            AuthError.UNAUTHORISED,
            new Error(
                "Missing auth tokens in cookies. Have you set the correct refresh API path in your frontend and SuperTokens config?"
            )
        );
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
            accessToken.cookieSecure,
            accessToken.sameSite
        );
        attachRefreshTokenToCookie(
            res,
            refreshToken.token,
            refreshToken.expiry,
            refreshToken.domain,
            refreshToken.cookiePath,
            refreshToken.cookieSecure,
            refreshToken.sameSite
        );
        setIdRefreshTokenInHeaderAndCookie(
            res,
            idRefreshToken.token,
            idRefreshToken.expiry,
            idRefreshToken.domain,
            idRefreshToken.cookieSecure,
            idRefreshToken.cookiePath,
            idRefreshToken.sameSite
        );
        if (response.antiCsrfToken !== undefined) {
            setAntiCsrfTokenInHeaders(res, response.antiCsrfToken);
        }

        return new Session(
            accessToken.token,
            response.session.handle,
            response.session.userId,
            response.session.userDataInJWT,
            res
        );
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
                handShakeInfo.refreshTokenPath,
                handShakeInfo.idRefreshTokenPath,
                handShakeInfo.cookieSameSite
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
export async function revokeSession(sessionHandle: string): Promise<boolean> {
    return SessionFunctions.revokeSession(sessionHandle);
}

/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeMultipleSessions(sessionHandles: string[]) {
    return SessionFunctions.revokeMultipleSessions(sessionHandles);
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
export function setRelevantHeadersForOptionsAPI(res: express.Response) {
    setOptionsAPIHeader(res);
}
/**
 * @returns jwt payload as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function getJWTPayload(sessionHandle: string): Promise<any> {
    return SessionFunctions.getJWTPayload(sessionHandle);
}

/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function updateJWTPayload(sessionHandle: string, newJWTPayload: any) {
    return SessionFunctions.updateJWTPayload(sessionHandle, newJWTPayload);
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
    private accessToken: string;

    constructor(accessToken: string, sessionHandle: string, userId: string, userDataInJWT: any, res: express.Response) {
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInJWT = userDataInJWT;
        this.res = res;
        this.accessToken = accessToken;
    }

    /**
     * @description call this to logout the current user.
     * This only invalidates the refresh token. The access token can still be used after
     * @sideEffect may clear cookies from response.
     * @throw AuthError GENERAL_ERROR
     */
    revokeSession = async () => {
        if (await SessionFunctions.revokeSession(this.sessionHandle)) {
            let handShakeInfo = await HandshakeInfo.getInstance();
            clearSessionFromCookie(
                this.res,
                handShakeInfo.cookieDomain,
                handShakeInfo.cookieSecure,
                handShakeInfo.accessTokenPath,
                handShakeInfo.refreshTokenPath,
                handShakeInfo.idRefreshTokenPath,
                handShakeInfo.cookieSameSite
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
                    handShakeInfo.refreshTokenPath,
                    handShakeInfo.idRefreshTokenPath,
                    handShakeInfo.cookieSameSite
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
                    handShakeInfo.refreshTokenPath,
                    handShakeInfo.idRefreshTokenPath,
                    handShakeInfo.cookieSameSite
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

    getHandle = () => {
        return this.sessionHandle;
    };

    getAccessToken = () => {
        return this.accessToken;
    };

    updateJWTPayload = async (newJWTPayload: any) => {
        if ((await Querier.getInstance().getAPIVersion()) === "1.0") {
            throw generateError(
                AuthError.GENERAL_ERROR,
                new Error("the current function is not supported for the core")
            );
        }
        let response = await Querier.getInstance().sendPostRequest("/session/regenerate", {
            accessToken: this.accessToken,
            userDataInJWT: newJWTPayload,
        });
        if (response.status === "UNAUTHORISED") {
            let handShakeInfo = await HandshakeInfo.getInstance();
            clearSessionFromCookie(
                this.res,
                handShakeInfo.cookieDomain,
                handShakeInfo.cookieSecure,
                handShakeInfo.accessTokenPath,
                handShakeInfo.refreshTokenPath,
                handShakeInfo.idRefreshTokenPath,
                handShakeInfo.cookieSameSite
            );
            throw generateError(AuthError.UNAUTHORISED, new Error(response.message));
        }
        this.userDataInJWT = response.session.userDataInJWT;
        if (response.accessToken !== undefined) {
            this.accessToken = response.accessToken.token;
            attachAccessTokenToCookie(
                this.res,
                response.accessToken.token,
                response.accessToken.expiry,
                response.accessToken.domain,
                response.accessToken.cookiePath,
                response.accessToken.cookieSecure,
                response.accessToken.sameSite
            );
        }
    };
}
