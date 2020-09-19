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
import { SessionRequest, TypeFaunaDBInput } from "./types";
import * as OriginalExpress from "../";
import * as faunadb from "faunadb";
import { attachCreateOrRefreshSessionResponseToExpressRes } from "../utils";
import * as SessionFunctions from "../session";
import { AuthError, generateError } from "../error";

let accessFaunaDBTokenFromFrontend: boolean;
let faunaDBClient: faunadb.Client;
let userCollectionName: string;
const FAUNADB_TOKEN_TIME_LAG_MILLI = 30 * 1000;
const FAUNADB_SESSION_KEY = "faunadbToken";
const q = faunadb.query;

/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * @param config
 */
export function init(config: TypeFaunaDBInput) {
    faunaDBClient = new faunadb.Client({
        secret: config.faunadbSecret,
    });
    userCollectionName = config.userCollectionName;
    accessFaunaDBTokenFromFrontend =
        config.accessFaunadbTokenFromFrontend === undefined ? false : config.accessFaunadbTokenFromFrontend;
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
    // TODO: HandshakeInfo should give the access token lifetime so that we do not have to do a double query
    let response = await SessionFunctions.createNewSession(userId, jwtPayload, sessionData);
    attachCreateOrRefreshSessionResponseToExpressRes(res, response);
    let session = new Session(
        response.accessToken.token,
        response.session.handle,
        response.session.userId,
        response.session.userDataInJWT,
        res
    );
    try {
        let accessTokenLifetime = response.accessToken.expiry - Date.now();

        let faunaResponse: any = await faunaDBClient.query(
            q.Create(q.Tokens(), {
                instance: q.Ref(q.Collection(userCollectionName), userId),
                ttl: q.TimeAdd(q.Now(), accessTokenLifetime + FAUNADB_TOKEN_TIME_LAG_MILLI, "millisecond"),
            })
        );

        let fdat = faunaResponse.secret; // faunadb access token

        if (accessFaunaDBTokenFromFrontend) {
            let newPayload = {
                ...jwtPayload,
            };
            newPayload[FAUNADB_SESSION_KEY] = fdat;
            await session.updateJWTPayload(newPayload);
        } else {
            let newPayload = {
                ...sessionData,
            };
            newPayload[FAUNADB_SESSION_KEY] = fdat;
            await session.updateSessionData(newPayload);
        }

        return session;
    } catch (err) {
        console.log(err);
        throw generateError(AuthError.GENERAL_ERROR, err);
    }
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
    let originalSession = await OriginalExpress.getSession(req, res, doAntiCsrfCheck);
    return new Session(
        originalSession.getAccessToken(),
        originalSession.getHandle(),
        originalSession.getUserId(),
        originalSession.getJWTPayload(),
        res
    );
}

/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 * @sideEffects may remove cookies, or change the accessToken and refreshToken.
 */
export async function refreshSession(req: express.Request, res: express.Response): Promise<Session> {
    let originalSession = await OriginalExpress.refreshSession(req, res);
    return new Session(
        originalSession.getAccessToken(),
        originalSession.getHandle(),
        originalSession.getUserId(),
        originalSession.getJWTPayload(),
        res
    );
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

    getFaunadbToken = async (): Promise<string> => {
        let jwtPayload = this.getJWTPayload();
        if (jwtPayload[FAUNADB_SESSION_KEY] !== undefined) {
            // this operation costs nothing. So we can check
            return jwtPayload[FAUNADB_SESSION_KEY];
        } else {
            let sessionData = await this.getSessionData();
            return sessionData[FAUNADB_SESSION_KEY];
        }
    };
}
