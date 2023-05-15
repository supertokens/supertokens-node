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
import { ParsedJWTInfo } from "./jwt";
import STError from "./error";
import { PROCESS_STATE, ProcessState } from "../../processState";
import { AntiCsrfType, CreateOrRefreshAPIResponse, SessionInformation } from "./types";
import NormalisedURLPath from "../../normalisedURLPath";
import { Helpers, JWKCacheMaxAgeInMs } from "./recipeImplementation";
import { maxVersion } from "../../utils";
import { logDebugMessage } from "../../logger";

/**
 * @description call this to "login" a user.
 */
export async function createNewSession(
    helpers: Helpers,
    userId: string,
    disableAntiCsrf: boolean,
    accessTokenPayload: any = {},
    antiCSRF: AntiCsrfType,
    sessionDataInDatabase: any = {}
): Promise<CreateOrRefreshAPIResponse> {
    accessTokenPayload = accessTokenPayload === null || accessTokenPayload === undefined ? {} : accessTokenPayload;
    sessionDataInDatabase =
        sessionDataInDatabase === null || sessionDataInDatabase === undefined ? {} : sessionDataInDatabase;

    const requestBody = {
        userId,
        userDataInJWT: accessTokenPayload,
        userDataInDatabase: sessionDataInDatabase,
        useDynamicSigningKey: helpers.config.useDynamicAccessTokenSigningKey,
        enableAntiCsrf: !disableAntiCsrf && antiCSRF === "VIA_TOKEN",
    };
    const response = await helpers.querier.sendPostRequest(new NormalisedURLPath("/recipe/session"), requestBody);

    delete response.status;
    return response;
}

/**
 * @description authenticates a session. To be used in APIs that require authentication
 */
export async function getSession(
    helpers: Helpers,
    parsedAccessToken: ParsedJWTInfo,
    antiCsrfToken: string | undefined,
    doAntiCsrfCheck: boolean,
    alwaysCheckCore: boolean,
    antiCSRF: AntiCsrfType
): Promise<{
    session: {
        handle: string;
        userId: string;
        userDataInJWT: any;
        expiryTime: number;
    };
    accessToken?: {
        token: string;
        expiry: number;
        createdTime: number;
    };
}> {
    let accessTokenInfo;

    try {
        /**
         * get access token info using jwks
         */
        accessTokenInfo = await getInfoFromAccessToken(
            parsedAccessToken,
            helpers.JWKS,
            antiCSRF === "VIA_TOKEN" && doAntiCsrfCheck
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
         * if access token creation time is after this signing key was created
         * we need to call core as there are chances that the token
         * was signed with the updated signing key
         *
         * if access token creation time is before oldest signing key was created,
         * so if foundASigningKeyThatIsOlderThanTheAccessToken is still false after
         * the loop we just return TRY_REFRESH_TOKEN
         */

        if (parsedAccessToken.version < 3) {
            let payload = parsedAccessToken.payload;

            const timeCreated = sanitizeNumberInput(payload.timeCreated);
            const expiryTime = sanitizeNumberInput(payload.expiryTime);

            if (expiryTime === undefined || timeCreated == undefined) {
                throw err;
            }

            if (expiryTime < Date.now()) {
                throw err;
            }
            // We check if the token was created since the last time we refreshed the keys from the core
            // Since we do not know the exact timing of the last refresh, we check against the max age
            if (timeCreated <= Date.now() - JWKCacheMaxAgeInMs) {
                throw err;
            }
        } else {
            // Since v3 (and above) tokens contain a kid we can trust the cache-refresh mechanism of the jose library.
            // This means we do not need to call the core since the signature wouldn't pass verification anyway.
            throw err;
        }
    }

    if (parsedAccessToken.version >= 3) {
        const tokenUsesDynamicKey = parsedAccessToken.kid!.startsWith("d-");
        if (tokenUsesDynamicKey !== helpers.config.useDynamicAccessTokenSigningKey) {
            logDebugMessage(
                "getSession: Returning TRY_REFRESH_TOKEN because the access token doesn't match the useDynamicAccessTokenSigningKey in the config"
            );
            throw new STError({
                message: "The access token doesn't match the useDynamicAccessTokenSigningKey setting",
                type: STError.TRY_REFRESH_TOKEN,
            });
        }
    }
    // If we get here we either have a V2 token that doesn't pass verification or a valid V3> token
    /**
     * anti-csrf check if accesstokenInfo is not undefined,
     * which means token verification was successful
     */
    if (doAntiCsrfCheck) {
        if (antiCSRF === "VIA_TOKEN") {
            if (accessTokenInfo !== undefined) {
                if (antiCsrfToken === undefined || antiCsrfToken !== accessTokenInfo.antiCsrfToken) {
                    if (antiCsrfToken === undefined) {
                        logDebugMessage(
                            "getSession: Returning TRY_REFRESH_TOKEN because antiCsrfToken is missing from request"
                        );
                        throw new STError({
                            message:
                                "Provided antiCsrfToken is undefined. If you do not want anti-csrf check for this API, please set doAntiCsrfCheck to false for this API",
                            type: STError.TRY_REFRESH_TOKEN,
                        });
                    } else {
                        logDebugMessage(
                            "getSession: Returning TRY_REFRESH_TOKEN because the passed antiCsrfToken is not the same as in the access token"
                        );
                        throw new STError({
                            message: "anti-csrf check failed",
                            type: STError.TRY_REFRESH_TOKEN,
                        });
                    }
                }
            }
        } else if (antiCSRF === "VIA_CUSTOM_HEADER") {
            // The function should never be called by this (we check this outside the function as well)
            // There we can add a bit more information to the error, so that's the primary check, this is just making sure.
            throw new Error("Please either use VIA_TOKEN, NONE or call with doAntiCsrfCheck false");
        }
    }

    if (accessTokenInfo !== undefined && !alwaysCheckCore && accessTokenInfo.parentRefreshTokenHash1 === undefined) {
        return {
            session: {
                handle: accessTokenInfo.sessionHandle,
                userId: accessTokenInfo.userId,
                userDataInJWT: accessTokenInfo.userData,
                expiryTime: accessTokenInfo.expiryTime,
            },
        };
    }

    ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);

    let requestBody = {
        accessToken: parsedAccessToken.rawTokenString,
        antiCsrfToken,
        doAntiCsrfCheck,
        enableAntiCsrf: antiCSRF === "VIA_TOKEN",
        checkDatabase: alwaysCheckCore,
    };

    let response = await helpers.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/verify"), requestBody);
    if (response.status === "OK") {
        delete response.status;
        response.session.expiryTime =
            response.accessToken?.expiry || // if we got a new accesstoken we take the expiry time from there
            accessTokenInfo?.expiryTime || // if we didn't get a new access token but could validate the token take that info (alwaysCheckCore === true, or parentRefreshTokenHash1 !== null)
            parsedAccessToken.payload["expiryTime"]; // if the token didn't pass validation, but we got here, it means it was a v2 token that we didn't have the key cached for.
        return response;
    } else if (response.status === "UNAUTHORISED") {
        logDebugMessage("getSession: Returning UNAUTHORISED because of core response");
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    } else {
        logDebugMessage("getSession: Returning TRY_REFRESH_TOKEN because of core response.");
        throw new STError({
            message: response.message,
            type: STError.TRY_REFRESH_TOKEN,
        });
    }
}

/**
 * @description Retrieves session information from storage for a given session handle
 * @returns session data stored in the database, including userData and access token payload, or undefined if sessionHandle is invalid
 */
export async function getSessionInformation(
    helpers: Helpers,
    sessionHandle: string
): Promise<SessionInformation | undefined> {
    let apiVersion = await helpers.querier.getAPIVersion();

    if (maxVersion(apiVersion, "2.7") === "2.7") {
        throw new Error("Please use core version >= 3.5 to call this function.");
    }

    let response = await helpers.querier.sendGetRequest(new NormalisedURLPath("/recipe/session"), {
        sessionHandle,
    });

    if (response.status === "OK") {
        // Change keys to make them more readable
        response["sessionDataInDatabase"] = response.userDataInDatabase;
        response["customClaimsInAccessTokenPayload"] = response.userDataInJWT;

        delete response.userDataInDatabase;
        delete response.userDataInJWT;

        return response;
    } else {
        return undefined;
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
    disableAntiCsrf: boolean,
    antiCSRF: AntiCsrfType
): Promise<CreateOrRefreshAPIResponse> {
    let requestBody: {
        refreshToken: string;
        antiCsrfToken?: string;
        enableAntiCsrf?: boolean;
    } = {
        refreshToken,
        antiCsrfToken,
        enableAntiCsrf: !disableAntiCsrf && antiCSRF === "VIA_TOKEN",
    };

    if (antiCSRF === "VIA_CUSTOM_HEADER" && !disableAntiCsrf) {
        // The function should never be called by this (we check this outside the function as well)
        // There we can add a bit more information to the error, so that's the primary check, this is just making sure.
        throw new Error("Please either use VIA_TOKEN, NONE or call with doAntiCsrfCheck false");
    }

    let response = await helpers.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/refresh"), requestBody);
    if (response.status === "OK") {
        delete response.status;
        return response;
    } else if (response.status === "UNAUTHORISED") {
        logDebugMessage("refreshSession: Returning UNAUTHORISED because of core response");
        throw new STError({
            message: response.message,
            type: STError.UNAUTHORISED,
        });
    } else {
        logDebugMessage("refreshSession: Returning TOKEN_THEFT_DETECTED because of core response");
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
export async function updateSessionDataInDatabase(
    helpers: Helpers,
    sessionHandle: string,
    newSessionData: any
): Promise<boolean> {
    newSessionData = newSessionData === null || newSessionData === undefined ? {} : newSessionData;
    let response = await helpers.querier.sendPutRequest(new NormalisedURLPath("/recipe/session/data"), {
        sessionHandle,
        userDataInDatabase: newSessionData,
    });
    if (response.status === "UNAUTHORISED") {
        return false;
    }
    return true;
}

export async function updateAccessTokenPayload(
    helpers: Helpers,
    sessionHandle: string,
    newAccessTokenPayload: any
): Promise<boolean> {
    newAccessTokenPayload =
        newAccessTokenPayload === null || newAccessTokenPayload === undefined ? {} : newAccessTokenPayload;
    let response = await helpers.querier.sendPutRequest(new NormalisedURLPath("/recipe/jwt/data"), {
        sessionHandle,
        userDataInJWT: newAccessTokenPayload,
    });
    if (response.status === "UNAUTHORISED") {
        return false;
    }
    return true;
}
