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
import { getInfoFromAccessToken } from "./accessToken";
import STError from "./error";
import { HandshakeInfo } from "./handshakeInfo";
import { PROCESS_STATE, ProcessState } from "../../processState";
import { Querier } from "../../querier";
import { CookieConfig } from "./cookieAndHeaders";
import { TypeInput, CreateOrRefreshAPIResponse, TypeNormalisedInput } from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import { getQuerier } from "./";

export class SessionConfig {
    private static instance: SessionConfig | undefined = undefined;
    sessionExpiredStatusCode: number;

    constructor(sessionExpiredStatusCode: number) {
        this.sessionExpiredStatusCode = sessionExpiredStatusCode;
    }

    static init(sessionExpiredStatusCode: number) {
        if (SessionConfig.instance === undefined) {
            SessionConfig.instance = new SessionConfig(sessionExpiredStatusCode);
        }
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: new Error("calling testing function in non testing env"),
            });
        }
        SessionConfig.instance = undefined;
    }

    static getInstanceOrThrowError() {
        if (SessionConfig.instance === undefined) {
            throw new Error("Please call the init function before using SuperTokens");
        }
        return SessionConfig.instance;
    }
}

/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * Please create a database in your mysql instance before calling this function
 * @throws AuthError GENERAL_ERROR in case anything fails.
 */
export function init(config: TypeInput) {
    let normalisedInput: TypeNormalisedInput = validateAndNormaliseUserInput(config);

    Querier.initInstance(normalisedInput.hosts, normalisedInput.apiKey);
    CookieConfig.init(
        normalisedInput.accessTokenPath,
        normalisedInput.apiBasePath,
        normalisedInput.cookieDomain,
        normalisedInput.cookieSecure,
        normalisedInput.cookieSameSite
    );
    SessionConfig.init(normalisedInput.sessionExpiredStatusCode);

    // this will also call the api version API
    HandshakeInfo.getInstance().catch((err) => {
        // ignored
    });
}

/**
 * @description call this to "login" a user.
 * @throws GENERAL_ERROR in case anything fails.
 */
export async function createNewSession(
    userId: string,
    jwtPayload: any = {},
    sessionData: any = {}
): Promise<CreateOrRefreshAPIResponse> {
    let response = await getQuerier().sendPostRequest("/session", {
        userId,
        userDataInJWT: jwtPayload,
        userDataInDatabase: sessionData,
    });
    let instance = await HandshakeInfo.getInstance();
    instance.updateJwtSigningPublicKeyInfo(response.jwtSigningPublicKey, response.jwtSigningPublicKeyExpiryTime);
    delete response.status;
    delete response.jwtSigningPublicKey;
    delete response.jwtSigningPublicKeyExpiryTime;
    // we check if sameSite is none, antiCsrfTokens is being sent - this is a security check
    if (CookieConfig.getInstanceOrThrowError().cookieSameSite === "none" && response.antiCsrfToken === undefined) {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error(
                'Security error: Cookie same site is "none" and anti-CSRF protection is disabled! Please either: \n- Change cookie same site to "lax" or to "strict". or \n- Enable anti-CSRF protection in the core by setting enable_anti_csrf to true.'
            ),
        });
    }
    return response;
}

/**
 * @description authenticates a session. To be used in APIs that require authentication
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED and TRY_REFRESH_TOKEN
 */
export async function getSession(
    accessToken: string,
    antiCsrfToken: string | undefined,
    doAntiCsrfCheck: boolean
): Promise<{
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
    let handShakeInfo = await HandshakeInfo.getInstance();

    try {
        if (handShakeInfo.jwtSigningPublicKeyExpiryTime > Date.now()) {
            let accessTokenInfo = await getInfoFromAccessToken(
                accessToken,
                handShakeInfo.jwtSigningPublicKey,
                handShakeInfo.enableAntiCsrf && doAntiCsrfCheck
            );
            let sessionHandle = accessTokenInfo.sessionHandle;

            // anti-csrf check
            if (
                handShakeInfo.enableAntiCsrf &&
                doAntiCsrfCheck &&
                (antiCsrfToken === undefined || antiCsrfToken !== accessTokenInfo.antiCsrfToken)
            ) {
                if (antiCsrfToken === undefined) {
                    throw new STError({
                        message:
                            "Provided antiCsrfToken is undefined. If you do not want anti-csrf check for this API, please set doAntiCsrfCheck to false",
                        type: STError.TRY_REFRESH_TOKEN,
                    });
                } else {
                    throw new STError({
                        message: "anti-csrf check failed",
                        type: STError.TRY_REFRESH_TOKEN,
                    });
                }
            }

            if (
                !handShakeInfo.accessTokenBlacklistingEnabled &&
                accessTokenInfo.parentRefreshTokenHash1 === undefined
            ) {
                return {
                    session: {
                        handle: accessTokenInfo.sessionHandle,
                        userId: accessTokenInfo.userId,
                        userDataInJWT: accessTokenInfo.userData,
                    },
                };
            }
        }
    } catch (err) {
        if (!STError.isErrorFromSession(err) || err.type !== STError.TRY_REFRESH_TOKEN) {
            // if error is try refresh token, we call the actual API.
            throw err;
        }
    }

    ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);

    let response = await getQuerier().sendPostRequest("/session/verify", {
        accessToken,
        antiCsrfToken,
        doAntiCsrfCheck,
    });
    if (response.status == "OK") {
        let instance = await HandshakeInfo.getInstance();
        instance.updateJwtSigningPublicKeyInfo(response.jwtSigningPublicKey, response.jwtSigningPublicKeyExpiryTime);
        delete response.status;
        delete response.jwtSigningPublicKey;
        delete response.jwtSigningPublicKeyExpiryTime;
        return response;
    } else if (response.status == "UNAUTHORISED") {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    } else {
        throw new STError({
            message: response.message,
            type: STError.TRY_REFRESH_TOKEN,
        });
    }
}

/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 */
export async function refreshSession(
    refreshToken: string,
    antiCsrfToken: string | undefined
): Promise<CreateOrRefreshAPIResponse> {
    let response = await getQuerier().sendPostRequest("/session/refresh", {
        refreshToken,
        antiCsrfToken,
    });
    if (response.status == "OK") {
        delete response.status;
        return response;
    } else if (response.status == "UNAUTHORISED") {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    } else {
        throw new STError({
            message: "Token theft detected",
            payload: {
                userId: response.session.userId,
                sessionHandle: response.session.sessionHandle,
            },
            type: STError.TOKEN_THEFT_DETECTED,
        });
    }
}

/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a bloacklisting method. Or changed the private key to sign them.
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeAllSessionsForUser(userId: string): Promise<string[]> {
    let response = await getQuerier().sendPostRequest("/session/remove", {
        userId,
    });
    return response.sessionHandlesRevoked;
}

/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
export async function getAllSessionHandlesForUser(userId: string): Promise<string[]> {
    let response = await getQuerier().sendGetRequest("/session/user", {
        userId,
    });
    return response.sessionHandles;
}

/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeSession(sessionHandle: string): Promise<boolean> {
    let response = await getQuerier().sendPostRequest("/session/remove", {
        sessionHandles: [sessionHandle],
    });
    return response.sessionHandlesRevoked.length === 1;
}

/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeMultipleSessions(sessionHandles: string[]): Promise<string[]> {
    let response = await getQuerier().sendPostRequest("/session/remove", {
        sessionHandles,
    });
    return response.sessionHandlesRevoked;
}

/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function getSessionData(sessionHandle: string): Promise<any> {
    let response = await getQuerier().sendGetRequest("/session/data", {
        sessionHandle,
    });
    if (response.status === "OK") {
        return response.userDataInDatabase;
    } else {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    }
}

/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function updateSessionData(sessionHandle: string, newSessionData: any) {
    let response = await getQuerier().sendPutRequest("/session/data", {
        sessionHandle,
        userDataInDatabase: newSessionData,
    });
    if (response.status === "UNAUTHORISED") {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    }
}

/**
 * @returns jwt payload as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function getJWTPayload(sessionHandle: string): Promise<any> {
    let response = await getQuerier().sendGetRequest("/jwt/data", {
        sessionHandle,
    });
    if (response.status === "OK") {
        return response.userDataInJWT;
    } else {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    }
}

/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function updateJWTPayload(sessionHandle: string, newJWTPayload: any) {
    let response = await getQuerier().sendPutRequest("/jwt/data", {
        sessionHandle,
        userDataInJWT: newJWTPayload,
    });
    if (response.status === "UNAUTHORISED") {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    }
}
