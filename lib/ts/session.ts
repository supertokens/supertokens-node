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
import { AuthError, generateError } from "./error";
import { HandshakeInfo } from "./handshakeInfo";
import { PROCESS_STATE, ProcessState } from "./processState";
import { Querier } from "./querier";
import { TypeInput } from "./types";

export { AuthError as Error } from "./error";
/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * Please create a database in your mysql instance before calling this function
 * @throws AuthError GENERAL_ERROR in case anything fails.
 */
export function init(hosts: TypeInput) {
    Querier.initInstance(hosts);

    // this will also call the api version API
    HandshakeInfo.getInstance().catch(err => {
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
): Promise<{
    session: {
        handle: string;
        userId: string;
        userDataInJWT: any;
    };
    accessToken: {
        token: string;
        expiry: number;
        createdTime: number;
        cookiePath: string;
        cookieSecure: boolean;
        domain: string;
        sameSite: "none" | "lax" | "strict";
    };
    refreshToken: {
        token: string;
        expiry: number;
        createdTime: number;
        cookiePath: string;
        cookieSecure: boolean;
        domain: string;
        sameSite: "none" | "lax" | "strict";
    };
    idRefreshToken: {
        token: string;
        expiry: number;
        createdTime: number;
        cookiePath: string;
        cookieSecure: boolean;
        domain: string;
        sameSite: "none" | "lax" | "strict";
    };
    antiCsrfToken: string | undefined;
}> {
    let response = await Querier.getInstance().sendPostRequest("/session", {
        userId,
        userDataInJWT: jwtPayload,
        userDataInDatabase: sessionData
    });
    let instance = await HandshakeInfo.getInstance();
    instance.updateJwtSigningPublicKeyInfo(response.jwtSigningPublicKey, response.jwtSigningPublicKeyExpiryTime);
    delete response.status;
    delete response.jwtSigningPublicKey;
    delete response.jwtSigningPublicKeyExpiryTime;
    if ((await Querier.getInstance().getAPIVersion()) === "1.0") {
        try {
            return {
                ...response,
                accessToken: {
                    ...response.accessToken,
                    sameSite: "none"
                },
                refreshToken: {
                    ...response.refreshToken,
                    sameSite: "none"
                },
                idRefreshToken: {
                    ...response.idRefreshToken,
                    cookiePath: response.accessToken.cookiePath,
                    cookieSecure: response.accessToken.cookieSecure,
                    domain: response.accessToken.domain,
                    sameSite: "none"
                }
            };
        } catch (ignored) {}
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
    doAntiCsrfCheck: boolean,
    idRefreshToken: string | undefined
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
        cookiePath: string;
        cookieSecure: boolean;
        domain: string;
        sameSite: "none" | "lax" | "strict";
    };
}> {
    if (idRefreshToken === undefined) {
        throw generateError(AuthError.UNAUTHORISED, new Error("idRefreshToken missing"));
    }
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
                    throw generateError(
                        AuthError.TRY_REFRESH_TOKEN,
                        new Error(
                            "provided antiCsrfToken is undefined. If you do not want anti-csrf check for this API, please set doAntiCsrfCheck to true"
                        )
                    );
                } else {
                    throw generateError(AuthError.TRY_REFRESH_TOKEN, new Error("anti-csrf check failed"));
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
                        userDataInJWT: accessTokenInfo.userData
                    }
                };
            }
        }
    } catch (err) {
        if (!AuthError.isErrorFromAuth(err) || err.errType !== AuthError.TRY_REFRESH_TOKEN) {
            // if error is try refresh token, we call the actual API.
            throw err;
        }
    }

    ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);

    let response = await Querier.getInstance().sendPostRequest("/session/verify", {
        accessToken,
        antiCsrfToken,
        doAntiCsrfCheck
    });
    if (response.status == "OK") {
        let instance = await HandshakeInfo.getInstance();
        instance.updateJwtSigningPublicKeyInfo(response.jwtSigningPublicKey, response.jwtSigningPublicKeyExpiryTime);
        delete response.status;
        delete response.jwtSigningPublicKey;
        delete response.jwtSigningPublicKeyExpiryTime;

        if ((await Querier.getInstance().getAPIVersion()) === "1.0" && response.accessToken !== undefined) {
            try {
                return {
                    ...response,
                    accessToken: {
                        ...response.accessToken,
                        sameSite: "none"
                    }
                };
            } catch (ignored) {}
        }
        return response;
    } else if (response.status == "UNAUTHORISED") {
        throw generateError(AuthError.UNAUTHORISED, new Error(response.message));
    } else {
        throw generateError(AuthError.TRY_REFRESH_TOKEN, new Error(response.message));
    }
}

/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 */
export async function refreshSession(
    refreshToken: string
): Promise<{
    session: {
        handle: string;
        userId: string;
        userDataInJWT: any;
    };
    accessToken: {
        token: string;
        expiry: number;
        createdTime: number;
        cookiePath: string;
        cookieSecure: boolean;
        domain: string;
        sameSite: "none" | "lax" | "strict";
    };
    refreshToken: {
        token: string;
        expiry: number;
        createdTime: number;
        cookiePath: string;
        cookieSecure: boolean;
        domain: string;
        sameSite: "none" | "lax" | "strict";
    };
    idRefreshToken: {
        token: string;
        expiry: number;
        createdTime: number;
        cookiePath: string;
        cookieSecure: boolean;
        domain: string;
        sameSite: "none" | "lax" | "strict";
    };
    antiCsrfToken: string | undefined;
}> {
    let response = await Querier.getInstance().sendPostRequest("/session/refresh", {
        refreshToken
    });
    if (response.status == "OK") {
        delete response.status;
        if ((await Querier.getInstance().getAPIVersion()) === "1.0") {
            try {
                return {
                    ...response,
                    accessToken: {
                        ...response.accessToken,
                        sameSite: "none"
                    },
                    refreshToken: {
                        ...response.refreshToken,
                        sameSite: "none"
                    },
                    idRefreshToken: {
                        ...response.idRefreshToken,
                        cookiePath: response.accessToken.cookiePath,
                        cookieSecure: response.accessToken.cookieSecure,
                        domain: response.accessToken.domain,
                        sameSite: "none"
                    }
                };
            } catch (ignored) {}
        }
        return response;
    } else if (response.status == "UNAUTHORISED") {
        throw generateError(AuthError.UNAUTHORISED, new Error(response.message));
    } else {
        throw generateError(AuthError.TOKEN_THEFT_DETECTED, {
            sessionHandle: response.session.handle,
            userId: response.session.userId
        });
    }
}

/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a bloacklisting method. Or changed the private key to sign them.
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeAllSessionsForUser(userId: string): Promise<any> {
    if ((await Querier.getInstance().getAPIVersion()) === "1.0") {
        let response = await Querier.getInstance().sendDeleteRequest("/session", {
            userId
        });
        return response.numberOfSessionsRevoked;
    } else {
        let response = await Querier.getInstance().sendPostRequest("/session/remove", {
            userId
        });
        return response.sessionHandlesRevoked;
    }
}

/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
export async function getAllSessionHandlesForUser(userId: string): Promise<string[]> {
    let response = await Querier.getInstance().sendGetRequest("/session/user", {
        userId
    });
    return response.sessionHandles;
}

/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeSessionUsingSessionHandle(sessionHandle: string): Promise<boolean> {
    if ((await Querier.getInstance().getAPIVersion()) === "1.0") {
        let response = await Querier.getInstance().sendDeleteRequest("/session", {
            sessionHandle
        });
        return response.numberOfSessionsRevoked === 1;
    } else {
        let response = await Querier.getInstance().sendPostRequest("/session/remove", {
            sessionHandles: [sessionHandle]
        });
        return response.sessionHandlesRevoked.length === 1;
    }
}

/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeMultipleSessionsUsingSessionHandles(sessionHandles: string[]): Promise<any> {
    if ((await Querier.getInstance().getAPIVersion()) === "1.0") {
        let response = await Querier.getInstance().sendDeleteRequest("/session", {
            sessionHandles
        });
        return response.numberOfSessionsRevoked;
    } else {
        let response = await Querier.getInstance().sendPostRequest("/session/remove", {
            sessionHandles
        });
        return response.sessionHandlesRevoked;
    }
}

/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function getSessionData(sessionHandle: string): Promise<any> {
    let response = await Querier.getInstance().sendGetRequest("/session/data", {
        sessionHandle
    });
    if (response.status === "OK") {
        return response.userDataInDatabase;
    } else {
        throw generateError(AuthError.UNAUTHORISED, new Error(response.message));
    }
}

/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function updateSessionData(sessionHandle: string, newSessionData: any) {
    let response = await Querier.getInstance().sendPutRequest("/session/data", {
        sessionHandle,
        userDataInDatabase: newSessionData
    });
    if (response.status === "UNAUTHORISED") {
        throw generateError(AuthError.UNAUTHORISED, new Error(response.message));
    }
}

/**
 * @returns jwt payload as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function getJWTPayload(sessionHandle: string): Promise<any> {
    if ((await Querier.getInstance().getAPIVersion()) === "1.0") {
        throw generateError(
            AuthError.GENERAL_ERROR,
            new Error("the current function is not supported for the core. Please upgrade the supertokens service.")
        );
    }
    let response = await Querier.getInstance().sendGetRequest("/jwt/data", {
        sessionHandle
    });
    if (response.status === "OK") {
        return response.userDataInJWT;
    } else {
        throw generateError(AuthError.UNAUTHORISED, new Error(response.message));
    }
}

/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function updateJWTPayload(sessionHandle: string, newJWTPayload: any) {
    if ((await Querier.getInstance().getAPIVersion()) === "1.0") {
        throw generateError(
            AuthError.GENERAL_ERROR,
            new Error("the current function is not supported for the core. Please upgrade the supertokens service.")
        );
    }
    let response = await Querier.getInstance().sendPutRequest("/jwt/data", {
        sessionHandle,
        userDataInJWT: newJWTPayload
    });
    if (response.status === "UNAUTHORISED") {
        throw generateError(AuthError.UNAUTHORISED, new Error(response.message));
    }
}
