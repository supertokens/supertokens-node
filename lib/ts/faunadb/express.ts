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

import { getCORSAllowedHeaders as getCORSAllowedHeadersFromCookiesAndHeaders } from "../cookieAndHeaders";
import { TypeInput, SessionRequest } from "../types";
import * as OriginalExpress from "../";

/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * Please create a database in your mongo instance before calling this function
 * @param config
 * @param client: mongo client. Default is undefined. If you provide this, please make sure that it is already connected to the right database that has the auth collections. If you do not provide this, then the library will manage its own connection.
 */
export function init(config: TypeInput) {
    return OriginalExpress.init(config);
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
    return OriginalExpress.createNewSession(res, userId, jwtPayload, sessionData);
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
    return OriginalExpress.getSession(req, res, doAntiCsrfCheck);
}

/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 * @sideEffects may remove cookies, or change the accessToken and refreshToken.
 */
export async function refreshSession(req: express.Request, res: express.Response): Promise<Session> {
    return OriginalExpress.refreshSession(req, res);
}

/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated, unless we enable a blacklisting. Or changed the private key to sign them.
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeAllSessionsForUser(userId: string) {
    return OriginalExpress.revokeAllSessionsForUser(userId);
}

/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
export async function getAllSessionHandlesForUser(userId: string): Promise<string[]> {
    return OriginalExpress.getAllSessionHandlesForUser(userId);
}

/**
 * @description call to destroy one session. This will not clear cookies, so if you have a Session object, please use that.
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeSession(sessionHandle: string): Promise<boolean> {
    return OriginalExpress.revokeSession(sessionHandle);
}

/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeMultipleSessions(sessionHandles: string[]) {
    return OriginalExpress.revokeMultipleSessions(sessionHandles);
}

/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself. If you have a Session object, please use that instead.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function getSessionData(sessionHandle: string): Promise<any> {
    return OriginalExpress.getSessionData(sessionHandle);
}

/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well. If you have a Session object, please use that instead.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function updateSessionData(sessionHandle: string, newSessionData: any) {
    return OriginalExpress.updateSessionData(sessionHandle, newSessionData);
}

/**
 * @description Sets relevant Access-Control-Allow-Headers and Access-Control-Allow-Credentials headers
 */
export function setRelevantHeadersForOptionsAPI(res: express.Response) {
    return OriginalExpress.setRelevantHeadersForOptionsAPI(res);
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
    return OriginalExpress.getJWTPayload(sessionHandle);
}

/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function updateJWTPayload(sessionHandle: string, newJWTPayload: any) {
    return OriginalExpress.updateJWTPayload(sessionHandle, newJWTPayload);
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
    return OriginalExpress.auth0Handler(request, response, next, domain, clientId, clientSecret, callback);
}

/**
 * @class Session
 * @description an instance of this is created when a session is valid.
 */
export class Session extends OriginalExpress.Session {
    constructor(accessToken: string, sessionHandle: string, userId: string, userDataInJWT: any, res: express.Response) {
        super(accessToken, sessionHandle, userId, userDataInJWT, res);
    }
}
