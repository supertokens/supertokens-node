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
import { CreateOrRefreshAPIResponse, GrantPayloadType, SessionInformation } from "./types";
import NormalisedURLPath from "../../normalisedURLPath";
import { Helpers } from "./recipeImplementation";
import { maxVersion } from "../../utils";

/**
 * @description call this to "login" a user.
 */
export async function createNewSession(
    helpers: Helpers,
    userId: string,
    sessionGrants: GrantPayloadType,
    accessTokenPayload: any = {},
    sessionData: any = {}
): Promise<CreateOrRefreshAPIResponse> {
    accessTokenPayload = accessTokenPayload === null || accessTokenPayload === undefined ? {} : accessTokenPayload;
    sessionData = sessionData === null || sessionData === undefined ? {} : sessionData;

    let requestBody: {
        userId: string;
        userDataInJWT: any;
        userDataInDatabase: any;
        enableAntiCsrf?: boolean;
        grants: GrantPayloadType;
    } = {
        userId,
        userDataInJWT: accessTokenPayload,
        userDataInDatabase: sessionData,
        grants: sessionGrants,
    };

    let handShakeInfo = await helpers.getHandshakeInfo();
    requestBody.enableAntiCsrf = handShakeInfo.antiCsrf === "VIA_TOKEN";
    let response = await helpers.querier.sendPostRequest(new NormalisedURLPath("/recipe/session"), requestBody);
    helpers.updateJwtSigningPublicKeyInfo(
        response.jwtSigningPublicKeyList,
        response.jwtSigningPublicKey,
        response.jwtSigningPublicKeyExpiryTime
    );
    delete response.status;
    delete response.jwtSigningPublicKey;
    delete response.jwtSigningPublicKeyExpiryTime;
    delete response.jwtSigningPublicKeyList;

    return response;
}

/**
 * @description authenticates a session. To be used in APIs that require authentication
 */
export async function getSession(
    helpers: Helpers,
    accessToken: string,
    antiCsrfToken: string | undefined,
    doAntiCsrfCheck: boolean,
    containsCustomHeader: boolean
): Promise<{
    session: {
        handle: string;
        userId: string;
        userDataInJWT: any;
        grants: GrantPayloadType;
    };
    accessToken?: {
        token: string;
        expiry: number;
        createdTime: number;
    };
}> {
    let handShakeInfo = await helpers.getHandshakeInfo();
    let accessTokenInfo;

    // If we have no key old enough to verify this access token we should reject it without calling the core
    let foundASigningKeyThatIsOlderThanTheAccessToken = false;
    for (const key of handShakeInfo.getJwtSigningPublicKeyList()) {
        try {
            /**
             * get access token info using existing signingKey
             */
            accessTokenInfo = await getInfoFromAccessToken(
                accessToken,
                key.publicKey,
                handShakeInfo.antiCsrf === "VIA_TOKEN" && doAntiCsrfCheck
            );
            foundASigningKeyThatIsOlderThanTheAccessToken = true;
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
             * if access token creation time is after this signing key was created
             * we need to call core as there are chances that the token
             * was signed with the updated signing key
             *
             * if access token creation time is before oldest signing key was created,
             * so if foundASigningKeyThatIsOlderThanTheAccessToken is still false after
             * the loop we just return TRY_REFRESH_TOKEN
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

            const timeCreated = sanitizeNumberInput(payload.timeCreated);
            const expiryTime = sanitizeNumberInput(payload.expiryTime);

            if (expiryTime === undefined || expiryTime < Date.now()) {
                throw err;
            }

            if (timeCreated === undefined) {
                throw err;
            }

            // If we reached a key older than the token and failed to validate the token,
            // that means it was signed by a key newer than the cached list.
            // In this case we go to the server.
            if (timeCreated >= key.createdAt) {
                foundASigningKeyThatIsOlderThanTheAccessToken = true;
                break;
            }
        }
    }

    // If the token was created before the oldest key in the cache but hasn't expired, then a config value must've changed.
    // E.g., the access_token_signing_key_update_interval was reduced, or access_token_signing_key_dynamic was turned on.
    // Either way, the user needs to refresh the access token as validating by the server is likely to do nothing.
    if (!foundASigningKeyThatIsOlderThanTheAccessToken) {
        throw new STError({
            message: "Access token has expired. Please call the refresh API",
            type: STError.TRY_REFRESH_TOKEN,
        });
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
                grants: accessTokenInfo.grants,
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

    let response = await helpers.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/verify"), requestBody);
    if (response.status === "OK") {
        helpers.updateJwtSigningPublicKeyInfo(
            response.jwtSigningPublicKeyList,
            response.jwtSigningPublicKey,
            response.jwtSigningPublicKeyExpiryTime
        );
        delete response.status;
        delete response.jwtSigningPublicKey;
        delete response.jwtSigningPublicKeyExpiryTime;
        delete response.jwtSigningPublicKeyList;
        return response;
    } else if (response.status === "UNAUTHORISED") {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    } else {
        if (
            response.jwtSigningPublicKeyList !== undefined ||
            (response.jwtSigningPublicKey !== undefined && response.jwtSigningPublicKeyExpiryTime !== undefined)
        ) {
            // after CDI 2.7.1, the API returns the new keys
            helpers.updateJwtSigningPublicKeyInfo(
                response.jwtSigningPublicKeyList,
                response.jwtSigningPublicKey,
                response.jwtSigningPublicKeyExpiryTime
            );
        } else {
            // we force update the signing keys...
            await helpers.getHandshakeInfo(true);
        }
        throw new STError({
            message: response.message,
            type: STError.TRY_REFRESH_TOKEN,
        });
    }
}

/**
 * @description Retrieves session information from storage for a given session handle
 * @returns session data stored in the database, including userData and access token payload
 */
export async function getSessionInformation(helpers: Helpers, sessionHandle: string): Promise<SessionInformation> {
    let apiVersion = await helpers.querier.getAPIVersion();

    if (maxVersion(apiVersion, "2.7") === "2.7") {
        throw new Error("Please use core version >= 3.5 to call this function.");
    }

    let response = await helpers.querier.sendGetRequest(new NormalisedURLPath("/recipe/session"), {
        sessionHandle,
    });

    if (response.status === "OK") {
        // Change keys to make them more readable
        response["sessionData"] = response.userDataInDatabase;
        response["accessTokenPayload"] = response.userDataInJWT;

        delete response.userDataInJWT;
        delete response.userDataInJWT;

        return response;
    } else {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    }
}

/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 */
export async function refreshSession(
    helpers: Helpers,
    refreshToken: string,
    antiCsrfToken: string | undefined,
    containsCustomHeader: boolean
): Promise<CreateOrRefreshAPIResponse> {
    let handShakeInfo = await helpers.getHandshakeInfo();

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

    let response = await helpers.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/refresh"), requestBody);
    if (response.status === "OK") {
        delete response.status;
        return response;
    } else if (response.status === "UNAUTHORISED") {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
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
export async function revokeAllSessionsForUser(helpers: Helpers, userId: string): Promise<string[]> {
    let response = await helpers.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/remove"), {
        userId,
    });
    return response.sessionHandlesRevoked;
}

/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 */
export async function getAllSessionHandlesForUser(helpers: Helpers, userId: string): Promise<string[]> {
    let response = await helpers.querier.sendGetRequest(new NormalisedURLPath("/recipe/session/user"), {
        userId,
    });
    return response.sessionHandles;
}

/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 */
export async function revokeSession(helpers: Helpers, sessionHandle: string): Promise<boolean> {
    let response = await helpers.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/remove"), {
        sessionHandles: [sessionHandle],
    });
    return response.sessionHandlesRevoked.length === 1;
}

/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 */
export async function revokeMultipleSessions(helpers: Helpers, sessionHandles: string[]): Promise<string[]> {
    let response = await helpers.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/remove"), {
        sessionHandles,
    });
    return response.sessionHandlesRevoked;
}

/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 */
export async function updateSessionData(helpers: Helpers, sessionHandle: string, newSessionData: any) {
    newSessionData = newSessionData === null || newSessionData === undefined ? {} : newSessionData;
    let response = await helpers.querier.sendPutRequest(new NormalisedURLPath("/recipe/session/data"), {
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
 * @deprecated use getSessionInformation() instead
 * @returns access token payload as provided by the user earlier
 */
export async function getAccessTokenPayload(helpers: Helpers, sessionHandle: string): Promise<any> {
    let response = await helpers.querier.sendGetRequest(new NormalisedURLPath("/recipe/jwt/data"), {
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

export async function updateAccessTokenPayload(helpers: Helpers, sessionHandle: string, newAccessTokenPayload: any) {
    newAccessTokenPayload =
        newAccessTokenPayload === null || newAccessTokenPayload === undefined ? {} : newAccessTokenPayload;
    let response = await helpers.querier.sendPutRequest(new NormalisedURLPath("/recipe/jwt/data"), {
        sessionHandle,
        userDataInJWT: newAccessTokenPayload,
    });
    if (response.status === "UNAUTHORISED") {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    }
}

export async function updateSessionGrants(helpers: Helpers, sessionHandle: string, newGrants: any) {
    newGrants = newGrants === null || newGrants === undefined ? {} : newGrants;
    const response = await helpers.querier.sendPutRequest(new NormalisedURLPath("/recipe/session/grants"), {
        sessionHandle,
        grants: newGrants,
    });

    if (response.status === "UNAUTHORISED") {
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    }
}
