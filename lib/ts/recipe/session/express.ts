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
    clearSessionFromCookie,
    getAccessTokenFromCookie,
    getAntiCsrfTokenFromHeaders,
    getIdRefreshTokenFromCookie,
    getRefreshTokenFromCookie,
    setOptionsAPIHeader,
    getCORSAllowedHeaders as getCORSAllowedHeadersFromCookiesAndHeaders,
    setFrontTokenInHeaders,
} from "./cookieAndHeaders";
import STError from "./error";
import * as SessionFunctions from "./session";
import { TypeInput, SessionRequest, auth0RequestBody } from "./types";
import axios from "axios";
import * as qs from "querystring";
import * as jwt from "jsonwebtoken";
import { autoRefreshMiddleware } from "./middleware";
import { attachCreateOrRefreshSessionResponseToExpressRes } from "./utils";
import { getQuerier } from "./";

// TODO: Make it also work with PassportJS

/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * @param config
 */
export function init(config: TypeInput) {
    SessionFunctions.init(config);
    return autoRefreshMiddleware();
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
    attachCreateOrRefreshSessionResponseToExpressRes(res, response);
    return new Session(
        response.accessToken.token,
        response.session.handle,
        response.session.userId,
        response.session.userDataInJWT,
        response.accessToken.expiry,
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
    let idRefreshToken = getIdRefreshTokenFromCookie(req);
    if (idRefreshToken === undefined) {
        // we do not clear cookies here because of a
        // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17

        throw new STError({
            message: "Session does not exist. Are you sending the session tokens in the request as cookies?",
            type: STError.UNAUTHORISED,
        });
    }
    let accessToken = getAccessTokenFromCookie(req);
    if (accessToken === undefined) {
        // maybe the access token has expired.
        throw new STError({
            message: "Access token has expired. Please call the refresh API",
            type: STError.TRY_REFRESH_TOKEN,
        });
    }
    try {
        let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
        let response = await SessionFunctions.getSession(accessToken, antiCsrfToken, doAntiCsrfCheck);
        if (response.accessToken !== undefined) {
            setFrontTokenInHeaders(
                res,
                response.session.userId,
                response.accessToken.expiry,
                response.session.userDataInJWT
            );
            attachAccessTokenToCookie(res, response.accessToken.token, response.accessToken.expiry);
            accessToken = response.accessToken.token;
        }
        return new Session(
            accessToken,
            response.session.handle,
            response.session.userId,
            response.session.userDataInJWT,
            response.accessToken !== undefined ? response.accessToken.expiry : undefined,
            res
        );
    } catch (err) {
        if (STError.isErrorFromSession(err) && err.type === STError.UNAUTHORISED) {
            clearSessionFromCookie(res);
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
    let inputRefreshToken = getRefreshTokenFromCookie(req);
    if (inputRefreshToken === undefined) {
        // we do not clear cookies here because of a
        // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17

        throw new STError({
            message: "Refresh token not found. Are you sending the refresh token in the request as a cookie?",
            type: STError.UNAUTHORISED,
        });
    }

    try {
        let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
        let response = await SessionFunctions.refreshSession(inputRefreshToken, antiCsrfToken);
        attachCreateOrRefreshSessionResponseToExpressRes(res, response);
        return new Session(
            response.accessToken.token,
            response.session.handle,
            response.session.userId,
            response.session.userDataInJWT,
            response.accessToken.expiry,
            res
        );
    } catch (err) {
        if (
            STError.isErrorFromSession(err) &&
            (err.type === STError.UNAUTHORISED || err.type === STError.TOKEN_THEFT_DETECTED)
        ) {
            clearSessionFromCookie(res);
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
 * @description Used to set relevant CORS Access-Control-Allowed-Headers
 */
export function getCORSAllowedHeaders(): string[] {
    return getCORSAllowedHeadersFromCookiesAndHeaders();
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

export async function auth0Handler(
    request: SessionRequest,
    response: express.Response,
    next: express.NextFunction,
    domain: string,
    clientId: string,
    clientSecret: string,
    callback?: (userId: string, idToken: string, accessToken: string, refreshToken: string | undefined) => Promise<void>
) {
    try {
        let requestBody: auth0RequestBody = request.body;
        if (requestBody.action === "logout") {
            if (request.session === undefined) {
                request.session = await getSession(request, response, true);
            }
            await request.session.revokeSession();
            return response.json({});
        }
        let authCode = requestBody.code;
        let redirectURI = requestBody.redirect_uri;
        if (requestBody.action !== "login") {
            request.session = await getSession(request, response, true);
        }

        let formData = {};
        if (authCode === undefined && requestBody.action === "refresh") {
            let sessionData = await request.session.getSessionData();
            if (sessionData.refresh_token === undefined) {
                response.statusCode = 403;
                return response.json({});
            }
            formData = {
                grant_type: "refresh_token",
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: sessionData.refresh_token,
            };
        } else {
            formData = {
                grant_type: "authorization_code",
                client_id: clientId,
                client_secret: clientSecret,
                code: authCode,
                redirect_uri: redirectURI,
            };
        }
        let auth0Response;
        try {
            auth0Response = await axios({
                method: "post",
                url: `https://${domain}/oauth/token`,
                data: qs.stringify(formData),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });
        } catch (err) {
            if (err.response !== undefined && err.response.status < 500) {
                response.statusCode = err.response.status;
                return response.json({});
            }
            throw err;
        }
        let idToken = auth0Response.data.id_token;
        let expiresIn = auth0Response.data.expires_in;
        let accessToken = auth0Response.data.access_token;
        let refreshToken = auth0Response.data.refresh_token;

        if (requestBody.action === "login") {
            let payload = jwt.decode(idToken, { json: true });
            if (payload === null) {
                throw Error("invalid payload while decoding auth0 idToken");
            }
            if (callback !== undefined) {
                await callback(payload.sub, idToken, accessToken, refreshToken);
            } else {
                await createNewSession(
                    response,
                    payload.sub,
                    {},
                    {
                        refresh_token: refreshToken,
                    }
                );
            }
        } else if (authCode !== undefined) {
            let sessionData = await request.session.getSessionData();
            sessionData.refresh_token = refreshToken;
            await request.session.updateSessionData(sessionData);
        }
        return response.json({
            id_token: idToken,
            expires_in: expiresIn,
        });
    } catch (err) {
        next(
            new STError({
                type: STError.GENERAL_ERROR,
                payload: err,
            })
        );
    }
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
    private accessTokenExpiry: number | undefined;

    constructor(
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInJWT: any,
        accessTokenExpiry: number | undefined,
        res: express.Response
    ) {
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInJWT = userDataInJWT;
        this.res = res;
        this.accessToken = accessToken;
        this.accessTokenExpiry = accessTokenExpiry;
    }

    // TODO: remove when handshakeInfo has accessToken lifetime param
    getAccessTokenExpiry = () => {
        return this.accessTokenExpiry;
    };

    /**
     * @description call this to logout the current user.
     * This only invalidates the refresh token. The access token can still be used after
     * @sideEffect may clear cookies from response.
     * @throw AuthError GENERAL_ERROR
     */
    revokeSession = async () => {
        if (await SessionFunctions.revokeSession(this.sessionHandle)) {
            clearSessionFromCookie(this.res);
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
            if (STError.isErrorFromSession(err) && err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.res);
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
            if (STError.isErrorFromSession(err) && err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.res);
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
        let response = await getQuerier().sendPostRequest("/session/regenerate", {
            accessToken: this.accessToken,
            userDataInJWT: newJWTPayload,
        });
        if (response.status === "UNAUTHORISED") {
            clearSessionFromCookie(this.res);
            throw new STError({
                message: "Session has probably been revoked while updating JWT payload",
                type: STError.UNAUTHORISED,
            });
        }
        this.userDataInJWT = response.session.userDataInJWT;
        if (response.accessToken !== undefined) {
            this.accessToken = response.accessToken.token;
            setFrontTokenInHeaders(
                this.res,
                response.session.userId,
                response.accessToken.expiry,
                response.session.userDataInJWT
            );
            attachAccessTokenToCookie(this.res, response.accessToken.token, response.accessToken.expiry);
        }
    };
}
