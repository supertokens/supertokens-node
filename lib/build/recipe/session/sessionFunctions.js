"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNewSession = createNewSession;
exports.getSession = getSession;
exports.getSessionInformation = getSessionInformation;
exports.refreshSession = refreshSession;
exports.revokeAllSessionsForUser = revokeAllSessionsForUser;
exports.getAllSessionHandlesForUser = getAllSessionHandlesForUser;
exports.revokeSession = revokeSession;
exports.revokeMultipleSessions = revokeMultipleSessions;
exports.updateSessionDataInDatabase = updateSessionDataInDatabase;
exports.updateAccessTokenPayload = updateAccessTokenPayload;
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
const accessToken_1 = require("./accessToken");
const error_1 = __importDefault(require("./error"));
const processState_1 = require("../../processState");
const utils_1 = require("../../utils");
const logger_1 = require("../../logger");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const constants_1 = require("../multitenancy/constants");
const combinedRemoteJWKSet_1 = require("../../combinedRemoteJWKSet");
/**
 * @description call this to "login" a user.
 */
async function createNewSession(
    helpers,
    tenantId,
    recipeUserId,
    disableAntiCsrf,
    accessTokenPayload,
    sessionDataInDatabase,
    userContext
) {
    accessTokenPayload = accessTokenPayload === null || accessTokenPayload === undefined ? {} : accessTokenPayload;
    sessionDataInDatabase =
        sessionDataInDatabase === null || sessionDataInDatabase === undefined ? {} : sessionDataInDatabase;
    const requestBody = {
        userId: recipeUserId.getAsString(),
        userDataInJWT: Object.assign({}, accessTokenPayload),
        userDataInDatabase: sessionDataInDatabase,
        useDynamicSigningKey: helpers.config.useDynamicAccessTokenSigningKey,
        // We dont need to check if anti csrf is a function here because checking for "VIA_TOKEN" is enough
        enableAntiCsrf: !disableAntiCsrf && helpers.config.antiCsrfFunctionOrString === "VIA_TOKEN",
    };
    let response = await helpers.querier.sendPostRequest(
        {
            path: "/<tenantId>/recipe/session",
            params: {
                tenantId: tenantId,
            },
        },
        requestBody,
        userContext
    );
    return {
        session: {
            handle: response.session.handle,
            userId: response.session.userId,
            recipeUserId: new recipeUserId_1.default(response.session.recipeUserId),
            userDataInJWT: response.session.userDataInJWT,
            tenantId: response.session.tenantId,
        },
        accessToken: {
            token: response.accessToken.token,
            createdTime: response.accessToken.createdTime,
            expiry: response.accessToken.expiry,
        },
        refreshToken: {
            token: response.refreshToken.token,
            createdTime: response.refreshToken.createdTime,
            expiry: response.refreshToken.expiry,
        },
        antiCsrfToken: response.antiCsrfToken,
    };
}
/**
 * @description authenticates a session. To be used in APIs that require authentication
 */
async function getSession(
    helpers,
    parsedAccessToken,
    antiCsrfToken,
    doAntiCsrfCheck,
    alwaysCheckCore,
    config,
    userContext
) {
    var _a, _b;
    let accessTokenInfo;
    try {
        /**
         * get access token info using jwks
         */
        accessTokenInfo = await (0, accessToken_1.getInfoFromAccessToken)(
            parsedAccessToken,
            (0, combinedRemoteJWKSet_1.getCombinedJWKS)(config),
            helpers.config.antiCsrfFunctionOrString === "VIA_TOKEN" && doAntiCsrfCheck
        );
    } catch (err) {
        /**
         * if error type is not TRY_REFRESH_TOKEN, we return the
         * error to the user
         */
        if (err.type !== error_1.default.TRY_REFRESH_TOKEN) {
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
            const timeCreated = (0, accessToken_1.sanitizeNumberInput)(payload.timeCreated);
            const expiryTime = (0, accessToken_1.sanitizeNumberInput)(payload.expiryTime);
            if (expiryTime === undefined || timeCreated == undefined) {
                throw err;
            }
            if (expiryTime < Date.now()) {
                throw err;
            }
            // We check if the token was created since the last time we refreshed the keys from the core
            // Since we do not know the exact timing of the last refresh, we check against the max age
            if (timeCreated <= Date.now() - config.jwksRefreshIntervalSec * 1000) {
                throw err;
            }
        } else {
            // Since v3 (and above) tokens contain a kid we can trust the cache-refresh mechanism of the jose library.
            // This means we do not need to call the core since the signature wouldn't pass verification anyway.
            throw err;
        }
    }
    if (parsedAccessToken.version >= 3) {
        const tokenUsesDynamicKey = parsedAccessToken.kid.startsWith("d-");
        if (tokenUsesDynamicKey !== helpers.config.useDynamicAccessTokenSigningKey) {
            (0, logger_1.logDebugMessage)(
                "getSession: Returning TRY_REFRESH_TOKEN because the access token doesn't match the useDynamicAccessTokenSigningKey in the config"
            );
            throw new error_1.default({
                message: "The access token doesn't match the useDynamicAccessTokenSigningKey setting",
                type: error_1.default.TRY_REFRESH_TOKEN,
            });
        }
    }
    // If we get here we either have a V2 token that doesn't pass verification or a valid V3> token
    /**
     * anti-csrf check if accesstokenInfo is not undefined,
     * which means token verification was successful
     */
    if (doAntiCsrfCheck) {
        if (helpers.config.antiCsrfFunctionOrString === "VIA_TOKEN") {
            if (accessTokenInfo !== undefined) {
                if (antiCsrfToken === undefined || antiCsrfToken !== accessTokenInfo.antiCsrfToken) {
                    if (antiCsrfToken === undefined) {
                        (0, logger_1.logDebugMessage)(
                            "getSession: Returning TRY_REFRESH_TOKEN because antiCsrfToken is missing from request"
                        );
                        throw new error_1.default({
                            message:
                                "Provided antiCsrfToken is undefined. If you do not want anti-csrf check for this API, please set doAntiCsrfCheck to false for this API",
                            type: error_1.default.TRY_REFRESH_TOKEN,
                        });
                    } else {
                        (0, logger_1.logDebugMessage)(
                            "getSession: Returning TRY_REFRESH_TOKEN because the passed antiCsrfToken is not the same as in the access token"
                        );
                        throw new error_1.default({
                            message: "anti-csrf check failed",
                            type: error_1.default.TRY_REFRESH_TOKEN,
                        });
                    }
                }
            }
        } else if (
            typeof helpers.config.antiCsrfFunctionOrString === "string" &&
            helpers.config.antiCsrfFunctionOrString === "VIA_CUSTOM_HEADER"
        ) {
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
                recipeUserId: accessTokenInfo.recipeUserId,
                userDataInJWT: accessTokenInfo.userData,
                expiryTime: accessTokenInfo.expiryTime,
                tenantId: accessTokenInfo.tenantId,
            },
        };
    }
    processState_1.ProcessState.getInstance().addState(processState_1.PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
    let requestBody = {
        accessToken: parsedAccessToken.rawTokenString,
        antiCsrfToken,
        doAntiCsrfCheck,
        enableAntiCsrf: helpers.config.antiCsrfFunctionOrString === "VIA_TOKEN",
        checkDatabase: alwaysCheckCore,
    };
    let response = await helpers.querier.sendPostRequest("/recipe/session/verify", requestBody, userContext);
    if (response.status === "OK") {
        return {
            accessToken: response.accessToken,
            session: {
                handle: response.session.handle,
                userId: response.session.userId,
                recipeUserId: new recipeUserId_1.default(response.session.recipeUserId),
                expiryTime:
                    ((_a = response.accessToken) === null || _a === void 0 ? void 0 : _a.expiry) || // if we got a new accesstoken we take the expiry time from there
                    (accessTokenInfo === null || accessTokenInfo === void 0 ? void 0 : accessTokenInfo.expiryTime) || // if we didn't get a new access token but could validate the token take that info (alwaysCheckCore === true, or parentRefreshTokenHash1 !== null)
                    parsedAccessToken.payload["expiryTime"], // if the token didn't pass validation, but we got here, it means it was a v2 token that we didn't have the key cached for.
                tenantId:
                    ((_b = response.session) === null || _b === void 0 ? void 0 : _b.tenantId) ||
                    (accessTokenInfo === null || accessTokenInfo === void 0 ? void 0 : accessTokenInfo.tenantId) ||
                    constants_1.DEFAULT_TENANT_ID,
                userDataInJWT: response.session.userDataInJWT,
            },
        };
    } else if (response.status === "UNAUTHORISED") {
        (0, logger_1.logDebugMessage)("getSession: Returning UNAUTHORISED because of core response");
        throw new error_1.default({
            message: response.message,
            type: error_1.default.UNAUTHORISED,
        });
    } else {
        (0, logger_1.logDebugMessage)("getSession: Returning TRY_REFRESH_TOKEN because of core response.");
        throw new error_1.default({
            message: response.message,
            type: error_1.default.TRY_REFRESH_TOKEN,
        });
    }
}
/**
 * @description Retrieves session information from storage for a given session handle
 * @returns session data stored in the database, including userData and access token payload, or undefined if sessionHandle is invalid
 */
async function getSessionInformation(helpers, sessionHandle, userContext) {
    let apiVersion = await helpers.querier.getAPIVersion(userContext);
    if ((0, utils_1.maxVersion)(apiVersion, "2.7") === "2.7") {
        throw new Error("Please use core version >= 3.5 to call this function.");
    }
    let response = await helpers.querier.sendGetRequest(
        "/recipe/session",
        {
            sessionHandle,
        },
        userContext
    );
    if (response.status === "OK") {
        // Change keys to make them more readable
        return {
            sessionHandle: response.sessionHandle,
            timeCreated: response.timeCreated,
            expiry: response.expiry,
            userId: response.userId,
            recipeUserId: new recipeUserId_1.default(response.recipeUserId),
            sessionDataInDatabase: response.userDataInDatabase,
            customClaimsInAccessTokenPayload: response.userDataInJWT,
            tenantId: response.tenantId,
        };
    } else {
        return undefined;
    }
}
/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 */
async function refreshSession(
    helpers,
    refreshToken,
    antiCsrfToken,
    disableAntiCsrf,
    useDynamicAccessTokenSigningKey,
    userContext
) {
    let requestBody = {
        refreshToken,
        antiCsrfToken,
        enableAntiCsrf: !disableAntiCsrf && helpers.config.antiCsrfFunctionOrString === "VIA_TOKEN",
        useDynamicSigningKey: useDynamicAccessTokenSigningKey,
    };
    if (
        typeof helpers.config.antiCsrfFunctionOrString === "string" &&
        helpers.config.antiCsrfFunctionOrString === "VIA_CUSTOM_HEADER" &&
        !disableAntiCsrf
    ) {
        // The function should never be called by this (we check this outside the function as well)
        // There we can add a bit more information to the error, so that's the primary check, this is just making sure.
        throw new Error("Please either use VIA_TOKEN, NONE or call with doAntiCsrfCheck false");
    }
    let response = await helpers.querier.sendPostRequest("/recipe/session/refresh", requestBody, userContext);
    if (response.status === "OK") {
        return {
            session: {
                handle: response.session.handle,
                userId: response.session.userId,
                recipeUserId: new recipeUserId_1.default(response.session.recipeUserId),
                userDataInJWT: response.session.userDataInJWT,
                tenantId: response.session.tenantId,
            },
            accessToken: {
                token: response.accessToken.token,
                createdTime: response.accessToken.createdTime,
                expiry: response.accessToken.expiry,
            },
            refreshToken: {
                token: response.refreshToken.token,
                createdTime: response.refreshToken.createdTime,
                expiry: response.refreshToken.expiry,
            },
            antiCsrfToken: response.antiCsrfToken,
        };
    } else if (response.status === "UNAUTHORISED") {
        (0, logger_1.logDebugMessage)("refreshSession: Returning UNAUTHORISED because of core response");
        throw new error_1.default({
            message: response.message,
            type: error_1.default.UNAUTHORISED,
        });
    } else {
        (0, logger_1.logDebugMessage)("refreshSession: Returning TOKEN_THEFT_DETECTED because of core response");
        throw new error_1.default({
            message: "Token theft detected",
            payload: {
                recipeUserId: new recipeUserId_1.default(response.session.recipeUserId),
                userId: response.session.userId,
                sessionHandle: response.session.handle,
            },
            type: error_1.default.TOKEN_THEFT_DETECTED,
        });
    }
}
/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a blacklisting method. Or changed the private key to sign them.
 */
async function revokeAllSessionsForUser(
    helpers,
    userId,
    revokeSessionsForLinkedAccounts,
    tenantId,
    revokeAcrossAllTenants,
    userContext
) {
    if (tenantId === undefined) {
        tenantId = constants_1.DEFAULT_TENANT_ID;
    }
    const body = {
        userId,
        revokeSessionsForLinkedAccounts,
        revokeAcrossAllTenants,
    };
    if (revokeAcrossAllTenants) {
        const response = await helpers.querier.sendPostRequest("/recipe/session/remove", body, userContext);
        return response.sessionHandlesRevoked;
    }
    const response = await helpers.querier.sendPostRequest(
        {
            path: "/<tenantId>/recipe/session/remove",
            params: {
                tenantId: tenantId,
            },
        },
        body,
        userContext
    );
    return response.sessionHandlesRevoked;
}
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 */
async function getAllSessionHandlesForUser(
    helpers,
    userId,
    fetchSessionsForAllLinkedAccounts,
    tenantId,
    fetchAcrossAllTenants,
    userContext
) {
    if (tenantId === undefined) {
        tenantId = constants_1.DEFAULT_TENANT_ID;
    }
    let response = await helpers.querier.sendGetRequest(
        fetchAcrossAllTenants
            ? "/recipe/session/user"
            : {
                  path: "/<tenantId>/recipe/session/user",
                  params: {
                      tenantId: tenantId,
                  },
              },
        {
            userId,
            fetchSessionsForAllLinkedAccounts,
            fetchAcrossAllTenants,
        },
        userContext
    );
    return response.sessionHandles;
}
/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 */
async function revokeSession(helpers, sessionHandle, userContext) {
    let response = await helpers.querier.sendPostRequest(
        "/recipe/session/remove",
        {
            sessionHandles: [sessionHandle],
        },
        userContext
    );
    return response.sessionHandlesRevoked.length === 1;
}
/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 */
async function revokeMultipleSessions(helpers, sessionHandles, userContext) {
    let response = await helpers.querier.sendPostRequest(
        "/recipe/session/remove",
        {
            sessionHandles,
        },
        userContext
    );
    return response.sessionHandlesRevoked;
}
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 */
async function updateSessionDataInDatabase(helpers, sessionHandle, newSessionData, userContext) {
    newSessionData = newSessionData === null || newSessionData === undefined ? {} : newSessionData;
    let response = await helpers.querier.sendPutRequest(
        "/recipe/session/data",
        {
            sessionHandle,
            userDataInDatabase: newSessionData,
        },
        {},
        userContext
    );
    if (response.status === "UNAUTHORISED") {
        return false;
    }
    return true;
}
async function updateAccessTokenPayload(helpers, sessionHandle, newAccessTokenPayload, userContext) {
    newAccessTokenPayload =
        newAccessTokenPayload === null || newAccessTokenPayload === undefined ? {} : newAccessTokenPayload;
    let response = await helpers.querier.sendPutRequest(
        "/recipe/jwt/data",
        {
            sessionHandle,
            userDataInJWT: newAccessTokenPayload,
        },
        {},
        userContext
    );
    if (response.status === "UNAUTHORISED") {
        return false;
    }
    return true;
}
