/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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
import { PROCESS_STATE, ProcessState } from "../../processState";
import { CreateOrRefreshAPIResponse } from "./types";
import SessionRecipe from "./sessionRecipe";
import NormalisedURLPath from "../../normalisedURLPath";

/**
 * @description call this to "login" a user.
 * @throws GENERAL_ERROR in case anything fails.
 */
export async function createNewSession(
    recipeInstance: SessionRecipe,
    userId: string,
    jwtPayload: any = {},
    sessionData: any = {}
): Promise<CreateOrRefreshAPIResponse> {
    jwtPayload = jwtPayload === null || jwtPayload === undefined ? {} : jwtPayload;
    sessionData = sessionData === null || sessionData === undefined ? {} : sessionData;
    let requestBody: {
        userId: string;
        userDataInJWT: any;
        userDataInDatabase: any;
        enableAntiCsrf?: boolean;
    } = {
        userId,
        userDataInJWT: jwtPayload,
        userDataInDatabase: sessionData,
    };

    let handShakeInfo = await recipeInstance.getHandshakeInfo();
    requestBody.enableAntiCsrf = handShakeInfo.antiCsrf === "VIA_TOKEN";
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance, "/recipe/session"), requestBody);
    recipeInstance.updateJwtSigningPublicKeyInfo(response.jwtSigningPublicKey, response.jwtSigningPublicKeyExpiryTime);
    delete response.status;
    delete response.jwtSigningPublicKey;
    delete response.jwtSigningPublicKeyExpiryTime;

    return response;
}

/**
 * @description authenticates a session. To be used in APIs that require authentication
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED and TRY_REFRESH_TOKEN
 */
export async function getSession(
    recipeInstance: SessionRecipe,
    accessToken: string,
    antiCsrfToken: string | undefined,
    doAntiCsrfCheck: boolean,
    containsCustomHeader: boolean
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
    let handShakeInfo = await recipeInstance.getHandshakeInfo();

    let fallbackToCore = true;
    try {
        if (handShakeInfo.jwtSigningPublicKeyExpiryTime > Date.now()) {
            let accessTokenInfo = await getInfoFromAccessToken(
                recipeInstance,
                accessToken,
                handShakeInfo.jwtSigningPublicKey,
                handShakeInfo.antiCsrf === "VIA_TOKEN" && doAntiCsrfCheck
            );
            // anti-csrf check
            if (handShakeInfo.antiCsrf === "VIA_TOKEN" && doAntiCsrfCheck) {
                if (antiCsrfToken === undefined || antiCsrfToken !== accessTokenInfo.antiCsrfToken) {
                    if (antiCsrfToken === undefined) {
                        throw new STError(
                            {
                                message:
                                    "Provided antiCsrfToken is undefined. If you do not want anti-csrf check for this API, please set doAntiCsrfCheck to false for this API",
                                type: STError.TRY_REFRESH_TOKEN,
                            },
                            recipeInstance
                        );
                    } else {
                        throw new STError(
                            {
                                message: "anti-csrf check failed",
                                type: STError.TRY_REFRESH_TOKEN,
                            },
                            recipeInstance
                        );
                    }
                }
            } else if (handShakeInfo.antiCsrf === "VIA_CUSTOM_HEADER" && doAntiCsrfCheck) {
                if (!containsCustomHeader) {
                    fallbackToCore = false;
                    throw new STError(
                        {
                            message:
                                "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request, or set doAntiCsrfCheck to false for this API",
                            type: STError.TRY_REFRESH_TOKEN,
                        },
                        recipeInstance
                    );
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
        if (err.type !== STError.TRY_REFRESH_TOKEN || !fallbackToCore) {
            throw err;
        }
    }

    ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);

    let requestBody: {
        accessToken: string;
        antiCsrfToken?: string;
        doAntiCsrfCheck: boolean;
        enableAntiCsrf?: boolean;
    } = {
        accessToken,
        antiCsrfToken,
        doAntiCsrfCheck,
        enableAntiCsrf: handShakeInfo.antiCsrf === "VIA_TOKEN",
    };

    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance, "/recipe/session/verify"), requestBody);
    if (response.status === "OK") {
        recipeInstance.updateJwtSigningPublicKeyInfo(
            response.jwtSigningPublicKey,
            response.jwtSigningPublicKeyExpiryTime
        );
        delete response.status;
        delete response.jwtSigningPublicKey;
        delete response.jwtSigningPublicKeyExpiryTime;
        return response;
    } else if (response.status === "UNAUTHORISED") {
        throw new STError(
            {
                message: response.message,
                type: STError.UNAUTHORISED,
            },
            recipeInstance
        );
    } else {
        throw new STError(
            {
                message: response.message,
                type: STError.TRY_REFRESH_TOKEN,
            },
            recipeInstance
        );
    }
}

/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 */
export async function refreshSession(
    recipeInstance: SessionRecipe,
    refreshToken: string,
    antiCsrfToken: string | undefined,
    containsCustomHeader: boolean
): Promise<CreateOrRefreshAPIResponse> {
    let handShakeInfo = await recipeInstance.getHandshakeInfo();

    let requestBody: {
        refreshToken: string;
        antiCsrfToken?: string;
        enableAntiCsrf?: boolean;
    } = {
        refreshToken,
        antiCsrfToken,
        enableAntiCsrf: handShakeInfo.antiCsrf === "VIA_TOKEN",
    };

    if (handShakeInfo.antiCsrf === "VIA_CUSTOM_HEADER") {
        if (!containsCustomHeader) {
            throw new STError(
                {
                    message: "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request.",
                    type: STError.UNAUTHORISED,
                },
                recipeInstance
            );
        }
    }

    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance, "/recipe/session/refresh"), requestBody);
    if (response.status === "OK") {
        delete response.status;
        return response;
    } else if (response.status === "UNAUTHORISED") {
        throw new STError(
            {
                message: response.message,
                type: STError.UNAUTHORISED,
            },
            recipeInstance
        );
    } else {
        throw new STError(
            {
                message: "Token theft detected",
                payload: {
                    userId: response.session.userId,
                    sessionHandle: response.session.handle,
                },
                type: STError.TOKEN_THEFT_DETECTED,
            },
            recipeInstance
        );
    }
}

/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a blacklisting method. Or changed the private key to sign them.
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeAllSessionsForUser(recipeInstance: SessionRecipe, userId: string): Promise<string[]> {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance, "/recipe/session/remove"), {
            userId,
        });
    return response.sessionHandlesRevoked;
}

/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
export async function getAllSessionHandlesForUser(recipeInstance: SessionRecipe, userId: string): Promise<string[]> {
    let response = await recipeInstance
        .getQuerier()
        .sendGetRequest(new NormalisedURLPath(recipeInstance, "/recipe/session/user"), {
            userId,
        });
    return response.sessionHandles;
}

/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeSession(recipeInstance: SessionRecipe, sessionHandle: string): Promise<boolean> {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance, "/recipe/session/remove"), {
            sessionHandles: [sessionHandle],
        });
    return response.sessionHandlesRevoked.length === 1;
}

/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
export async function revokeMultipleSessions(
    recipeInstance: SessionRecipe,
    sessionHandles: string[]
): Promise<string[]> {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance, "/recipe/session/remove"), {
            sessionHandles,
        });
    return response.sessionHandlesRevoked;
}

/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function getSessionData(recipeInstance: SessionRecipe, sessionHandle: string): Promise<any> {
    let response = await recipeInstance
        .getQuerier()
        .sendGetRequest(new NormalisedURLPath(recipeInstance, "/recipe/session/data"), {
            sessionHandle,
        });
    if (response.status === "OK") {
        return response.userDataInDatabase;
    } else {
        throw new STError(
            {
                message: response.message,
                type: STError.UNAUTHORISED,
            },
            recipeInstance
        );
    }
}

/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function updateSessionData(recipeInstance: SessionRecipe, sessionHandle: string, newSessionData: any) {
    newSessionData = newSessionData === null || newSessionData === undefined ? {} : newSessionData;
    let response = await recipeInstance
        .getQuerier()
        .sendPutRequest(new NormalisedURLPath(recipeInstance, "/recipe/session/data"), {
            sessionHandle,
            userDataInDatabase: newSessionData,
        });
    if (response.status === "UNAUTHORISED") {
        throw new STError(
            {
                message: response.message,
                type: STError.UNAUTHORISED,
            },
            recipeInstance
        );
    }
}

/**
 * @returns jwt payload as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function getJWTPayload(recipeInstance: SessionRecipe, sessionHandle: string): Promise<any> {
    let response = await recipeInstance
        .getQuerier()
        .sendGetRequest(new NormalisedURLPath(recipeInstance, "/recipe/jwt/data"), {
            sessionHandle,
        });
    if (response.status === "OK") {
        return response.userDataInJWT;
    } else {
        throw new STError(
            {
                message: response.message,
                type: STError.UNAUTHORISED,
            },
            recipeInstance
        );
    }
}

/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export async function updateJWTPayload(recipeInstance: SessionRecipe, sessionHandle: string, newJWTPayload: any) {
    newJWTPayload = newJWTPayload === null || newJWTPayload === undefined ? {} : newJWTPayload;
    let response = await recipeInstance
        .getQuerier()
        .sendPutRequest(new NormalisedURLPath(recipeInstance, "/recipe/jwt/data"), {
            sessionHandle,
            userDataInJWT: newJWTPayload,
        });
    if (response.status === "UNAUTHORISED") {
        throw new STError(
            {
                message: response.message,
                type: STError.UNAUTHORISED,
            },
            recipeInstance
        );
    }
}
