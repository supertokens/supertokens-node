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
import { getInfoFromAccessToken, sanitizeNumberInput } from "./accessToken";
import { getPayloadWithoutVerifiying } from "./jwt";
import STError from "./error";
import { PROCESS_STATE, ProcessState } from "../../processState";
import { CreateOrRefreshAPIResponse } from "./types";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeImplementation from "./recipeImplementation";

/**
 * @description call this to "login" a user.
 */
export async function createNewSession(
    recipeImplementation: RecipeImplementation,
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

    let handShakeInfo = await recipeImplementation.getHandshakeInfo();
    requestBody.enableAntiCsrf = handShakeInfo.antiCsrf === "VIA_TOKEN";
    let response = await recipeImplementation.querier.sendPostRequest(
        new NormalisedURLPath("/recipe/session"),
        requestBody
    );
    recipeImplementation.updateJwtSigningPublicKeyInfo(
        response.jwtSigningPublicKey,
        response.jwtSigningPublicKeyExpiryTime
    );
    delete response.status;
    delete response.jwtSigningPublicKey;
    delete response.jwtSigningPublicKeyExpiryTime;

    return response;
}

/**
 * @description authenticates a session. To be used in APIs that require authentication
 */
export async function getSession(
    recipeImplementation: RecipeImplementation,
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
    let handShakeInfo = await recipeImplementation.getHandshakeInfo();
    let accessTokenInfo;
    /**
     * if jwtSigningPublicKeyExpiryTime is expired, we call core
     */
    if (handShakeInfo.jwtSigningPublicKeyExpiryTime > Date.now()) {
        try {
            /**
             * get access token info using existing signingKey
             */
            accessTokenInfo = await getInfoFromAccessToken(
                accessToken,
                handShakeInfo.jwtSigningPublicKey,
                handShakeInfo.antiCsrf === "VIA_TOKEN" && doAntiCsrfCheck
            );
        } catch (err) {
            /**
             * if error type is not TRY_REFRESH_TOKEN, we return the
             * error to the user
             */
            if (err.type !== STError.TRY_REFRESH_TOKEN) {
                throw err;
            }
            /**
             * if it comes here, it means token verification has failed.
             * It may be due to:
             *  - signing key was updated and this token was signed with new key
             *  - access token is actually expired
             *  - access token was signed with the older signing key
             *
             * if access token is actually expired, we don't need to call core and
             * just return TRY_REFRESH_TOKEN to the client
             *
             * if access token creation time is after the signing key was last
             * updated, we need to call core as there are chances that the token
             * was signed with the updated signing key
             *
             * if access token creation time is before the signing key was last
             * updated, we just return TRY_REFRESH_TOKEN to the client
             */
            let payload;
            try {
                payload = getPayloadWithoutVerifiying(accessToken);
            } catch (_) {
                throw err;
            }
            if (payload === undefined) {
                throw err;
            }
            let expiryTime = sanitizeNumberInput(payload.expiryTime);
            let timeCreated = sanitizeNumberInput(payload.timeCreated);

            if (expiryTime === undefined || expiryTime < Date.now()) {
                throw err;
            }
            if (timeCreated === undefined || handShakeInfo.signingKeyLastUpdated > timeCreated) {
                throw err;
            }
        }
    }
    /**
     * anti-csrf check if accesstokenInfo is not undefined,
     * which means token verification was successful
     */
    if (doAntiCsrfCheck) {
        if (handShakeInfo.antiCsrf === "VIA_TOKEN") {
            if (accessTokenInfo !== undefined) {
                if (antiCsrfToken === undefined || antiCsrfToken !== accessTokenInfo.antiCsrfToken) {
                    if (antiCsrfToken === undefined) {
                        throw new STError({
                            message:
                                "Provided antiCsrfToken is undefined. If you do not want anti-csrf check for this API, please set doAntiCsrfCheck to false for this API",
                            type: STError.TRY_REFRESH_TOKEN,
                        });
                    } else {
                        throw new STError({
                            message: "anti-csrf check failed",
                            type: STError.TRY_REFRESH_TOKEN,
                        });
                    }
                }
            }
        } else if (handShakeInfo.antiCsrf === "VIA_CUSTOM_HEADER") {
            if (!containsCustomHeader) {
                throw new STError({
                    message:
                        "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request, or set doAntiCsrfCheck to false for this API",
                    type: STError.TRY_REFRESH_TOKEN,
                });
            }
        }
    }
    if (
        accessTokenInfo !== undefined &&
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

    let response = await recipeImplementation.querier.sendPostRequest(
        new NormalisedURLPath("/recipe/session/verify"),
        requestBody
    );
    if (response.status === "OK") {
        recipeImplementation.updateJwtSigningPublicKeyInfo(
            response.jwtSigningPublicKey,
            response.jwtSigningPublicKeyExpiryTime
        );
        delete response.status;
        delete response.jwtSigningPublicKey;
        delete response.jwtSigningPublicKeyExpiryTime;
        return response;
    } else if (response.status === "UNAUTHORISED") {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    } else {
        if (response.jwtSigningPublicKey !== undefined && response.jwtSigningPublicKeyExpiryTime !== undefined) {
            // in CDI 2.7.1, the API returns the new keys
            recipeImplementation.updateJwtSigningPublicKeyInfo(
                response.jwtSigningPublicKey,
                response.jwtSigningPublicKeyExpiryTime
            );
        } else {
            // we force update the signing keys...
            await recipeImplementation.getHandshakeInfo(true);
        }
        throw new STError({
            message: response.message,
            type: STError.TRY_REFRESH_TOKEN,
        });
    }
}

/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 */
export async function refreshSession(
    recipeImplementation: RecipeImplementation,
    refreshToken: string,
    antiCsrfToken: string | undefined,
    containsCustomHeader: boolean
): Promise<CreateOrRefreshAPIResponse> {
    let handShakeInfo = await recipeImplementation.getHandshakeInfo();

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
            throw new STError({
                message: "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request.",
                type: STError.UNAUTHORISED,
                payload: {
                    clearCookies: false, // see https://github.com/supertokens/supertokens-node/issues/141
                },
            });
        }
    }

    let response = await recipeImplementation.querier.sendPostRequest(
        new NormalisedURLPath("/recipe/session/refresh"),
        requestBody
    );
    if (response.status === "OK") {
        delete response.status;
        return response;
    } else if (response.status === "UNAUTHORISED") {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
            payload: {
                // see https://github.com/supertokens/supertokens-node/issues/141
                clearCookies: response.message !== "Anti CSRF token missing, or not matching",
            },
        });
    } else {
        throw new STError({
            message: "Token theft detected",
            payload: {
                userId: response.session.userId,
                sessionHandle: response.session.handle,
            },
            type: STError.TOKEN_THEFT_DETECTED,
        });
    }
}

/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a blacklisting method. Or changed the private key to sign them.
 */
export async function revokeAllSessionsForUser(
    recipeImplementation: RecipeImplementation,
    userId: string
): Promise<string[]> {
    let response = await recipeImplementation.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/remove"), {
        userId,
    });
    return response.sessionHandlesRevoked;
}

/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 */
export async function getAllSessionHandlesForUser(
    recipeImplementation: RecipeImplementation,
    userId: string
): Promise<string[]> {
    let response = await recipeImplementation.querier.sendGetRequest(new NormalisedURLPath("/recipe/session/user"), {
        userId,
    });
    return response.sessionHandles;
}

/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 */
export async function revokeSession(
    recipeImplementation: RecipeImplementation,
    sessionHandle: string
): Promise<boolean> {
    let response = await recipeImplementation.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/remove"), {
        sessionHandles: [sessionHandle],
    });
    return response.sessionHandlesRevoked.length === 1;
}

/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 */
export async function revokeMultipleSessions(
    recipeImplementation: RecipeImplementation,
    sessionHandles: string[]
): Promise<string[]> {
    let response = await recipeImplementation.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/remove"), {
        sessionHandles,
    });
    return response.sessionHandlesRevoked;
}

/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
 * @returns session data as provided by the user earlier
 */
export async function getSessionData(recipeImplementation: RecipeImplementation, sessionHandle: string): Promise<any> {
    let response = await recipeImplementation.querier.sendGetRequest(new NormalisedURLPath("/recipe/session/data"), {
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
 */
export async function updateSessionData(
    recipeImplementation: RecipeImplementation,
    sessionHandle: string,
    newSessionData: any
) {
    newSessionData = newSessionData === null || newSessionData === undefined ? {} : newSessionData;
    let response = await recipeImplementation.querier.sendPutRequest(new NormalisedURLPath("/recipe/session/data"), {
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
 */
export async function getJWTPayload(recipeImplementation: RecipeImplementation, sessionHandle: string): Promise<any> {
    let response = await recipeImplementation.querier.sendGetRequest(new NormalisedURLPath("/recipe/jwt/data"), {
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

export async function updateJWTPayload(
    recipeImplementation: RecipeImplementation,
    sessionHandle: string,
    newJWTPayload: any
) {
    newJWTPayload = newJWTPayload === null || newJWTPayload === undefined ? {} : newJWTPayload;
    let response = await recipeImplementation.querier.sendPutRequest(new NormalisedURLPath("/recipe/jwt/data"), {
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
