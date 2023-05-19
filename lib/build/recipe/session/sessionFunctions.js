"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAccessTokenPayload = exports.updateSessionDataInDatabase = exports.revokeMultipleSessions = exports.revokeSession = exports.getAllSessionHandlesForUser = exports.revokeAllSessionsForUser = exports.refreshSession = exports.getSessionInformation = exports.getSession = exports.createNewSession = void 0;
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
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipeImplementation_1 = require("./recipeImplementation");
const utils_1 = require("../../utils");
const logger_1 = require("../../logger");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const mockCore_1 = require("./mockCore");
/**
 * @description call this to "login" a user.
 */
function createNewSession(
    helpers,
    userId,
    recipeUserId,
    disableAntiCsrf,
    accessTokenPayload = {},
    sessionDataInDatabase = {}
) {
    return __awaiter(this, void 0, void 0, function* () {
        accessTokenPayload = accessTokenPayload === null || accessTokenPayload === undefined ? {} : accessTokenPayload;
        sessionDataInDatabase =
            sessionDataInDatabase === null || sessionDataInDatabase === undefined ? {} : sessionDataInDatabase;
        const requestBody = {
            userId,
            recipeUserId: recipeUserId.getAsString(),
            userDataInJWT: accessTokenPayload,
            userDataInDatabase: sessionDataInDatabase,
            useDynamicSigningKey: helpers.config.useDynamicAccessTokenSigningKey,
            enableAntiCsrf: !disableAntiCsrf && helpers.config.antiCsrf === "VIA_TOKEN",
        };
        let response;
        if (process.env.MOCK !== "true") {
            response = yield helpers.querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/session"),
                requestBody
            );
        } else {
            response = yield mockCore_1.mockCreateNewSession(requestBody, helpers.querier);
        }
        delete response.status;
        return response;
    });
}
exports.createNewSession = createNewSession;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 */
function getSession(helpers, parsedAccessToken, antiCsrfToken, doAntiCsrfCheck, alwaysCheckCore) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let accessTokenInfo;
        try {
            /**
             * get access token info using jwks
             */
            accessTokenInfo = yield accessToken_1.getInfoFromAccessToken(
                parsedAccessToken,
                helpers.JWKS,
                helpers.config.antiCsrf === "VIA_TOKEN" && doAntiCsrfCheck
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
                const timeCreated = accessToken_1.sanitizeNumberInput(payload.timeCreated);
                const expiryTime = accessToken_1.sanitizeNumberInput(payload.expiryTime);
                if (expiryTime === undefined || timeCreated == undefined) {
                    throw err;
                }
                if (expiryTime < Date.now()) {
                    throw err;
                }
                // We check if the token was created since the last time we refreshed the keys from the core
                // Since we do not know the exact timing of the last refresh, we check against the max age
                if (timeCreated <= Date.now() - recipeImplementation_1.JWKCacheMaxAgeInMs) {
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
                logger_1.logDebugMessage(
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
            if (helpers.config.antiCsrf === "VIA_TOKEN") {
                if (accessTokenInfo !== undefined) {
                    if (antiCsrfToken === undefined || antiCsrfToken !== accessTokenInfo.antiCsrfToken) {
                        if (antiCsrfToken === undefined) {
                            logger_1.logDebugMessage(
                                "getSession: Returning TRY_REFRESH_TOKEN because antiCsrfToken is missing from request"
                            );
                            throw new error_1.default({
                                message:
                                    "Provided antiCsrfToken is undefined. If you do not want anti-csrf check for this API, please set doAntiCsrfCheck to false for this API",
                                type: error_1.default.TRY_REFRESH_TOKEN,
                            });
                        } else {
                            logger_1.logDebugMessage(
                                "getSession: Returning TRY_REFRESH_TOKEN because the passed antiCsrfToken is not the same as in the access token"
                            );
                            throw new error_1.default({
                                message: "anti-csrf check failed",
                                type: error_1.default.TRY_REFRESH_TOKEN,
                            });
                        }
                    }
                }
            } else if (helpers.config.antiCsrf === "VIA_CUSTOM_HEADER") {
                // The function should never be called by this (we check this outside the function as well)
                // There we can add a bit more information to the error, so that's the primary check, this is just making sure.
                throw new Error("Please either use VIA_TOKEN, NONE or call with doAntiCsrfCheck false");
            }
        }
        if (
            accessTokenInfo !== undefined &&
            !alwaysCheckCore &&
            accessTokenInfo.parentRefreshTokenHash1 === undefined
        ) {
            return {
                session: {
                    handle: accessTokenInfo.sessionHandle,
                    userId: accessTokenInfo.userId,
                    recipeUserId: accessTokenInfo.recipeUserId,
                    userDataInJWT: accessTokenInfo.userData,
                    expiryTime: accessTokenInfo.expiryTime,
                },
            };
        }
        processState_1.ProcessState.getInstance().addState(processState_1.PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        let requestBody = {
            accessToken: parsedAccessToken.rawTokenString,
            antiCsrfToken,
            doAntiCsrfCheck,
            enableAntiCsrf: helpers.config.antiCsrf === "VIA_TOKEN",
            checkDatabase: alwaysCheckCore,
        };
        let response;
        if (process.env.MOCK !== "true") {
            response = yield helpers.querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/session/verify"),
                requestBody
            );
        } else {
            response = yield mockCore_1.mockGetSession(requestBody, helpers.querier);
        }
        if (response.status === "OK") {
            delete response.status;
            response.session.expiryTime =
                ((_a = response.accessToken) === null || _a === void 0 ? void 0 : _a.expiry) || // if we got a new accesstoken we take the expiry time from there
                (accessTokenInfo === null || accessTokenInfo === void 0 ? void 0 : accessTokenInfo.expiryTime) || // if we didn't get a new access token but could validate the token take that info (alwaysCheckCore === true, or parentRefreshTokenHash1 !== null)
                parsedAccessToken.payload["expiryTime"]; // if the token didn't pass validation, but we got here, it means it was a v2 token that we didn't have the key cached for.
            return Object.assign(Object.assign({}, response), {
                session: Object.assign(Object.assign({}, response.session), {
                    recipeUserId: new recipeUserId_1.default(response.session.recipeUserId),
                }),
            });
        } else if (response.status === "UNAUTHORISED") {
            logger_1.logDebugMessage("getSession: Returning UNAUTHORISED because of core response");
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            });
        } else {
            logger_1.logDebugMessage("getSession: Returning TRY_REFRESH_TOKEN because of core response.");
            throw new error_1.default({
                message: response.message,
                type: error_1.default.TRY_REFRESH_TOKEN,
            });
        }
    });
}
exports.getSession = getSession;
/**
 * @description Retrieves session information from storage for a given session handle
 * @returns session data stored in the database, including userData and access token payload, or undefined if sessionHandle is invalid
 */
function getSessionInformation(helpers, sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        let apiVersion = yield helpers.querier.getAPIVersion();
        if (utils_1.maxVersion(apiVersion, "2.7") === "2.7") {
            throw new Error("Please use core version >= 3.5 to call this function.");
        }
        let response = yield helpers.querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/session"), {
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
    });
}
exports.getSessionInformation = getSessionInformation;
/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 */
function refreshSession(helpers, refreshToken, antiCsrfToken, disableAntiCsrf) {
    return __awaiter(this, void 0, void 0, function* () {
        let requestBody = {
            refreshToken,
            antiCsrfToken,
            enableAntiCsrf: !disableAntiCsrf && helpers.config.antiCsrf === "VIA_TOKEN",
        };
        if (helpers.config.antiCsrf === "VIA_CUSTOM_HEADER" && !disableAntiCsrf) {
            // The function should never be called by this (we check this outside the function as well)
            // There we can add a bit more information to the error, so that's the primary check, this is just making sure.
            throw new Error("Please either use VIA_TOKEN, NONE or call with doAntiCsrfCheck false");
        }
        let response;
        if (process.env.MOCK !== "true") {
            response = yield helpers.querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/session/refresh"),
                requestBody
            );
        } else {
            response = yield mockCore_1.mockGetRefreshAPIResponse(requestBody, helpers.querier);
        }
        if (response.status === "OK") {
            delete response.status;
            return Object.assign(Object.assign({}, response), {
                session: Object.assign(Object.assign({}, response.session), {
                    recipeUserId: new recipeUserId_1.default(response.session.recipeUserId),
                }),
            });
        } else if (response.status === "UNAUTHORISED") {
            logger_1.logDebugMessage("refreshSession: Returning UNAUTHORISED because of core response");
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            });
        } else {
            logger_1.logDebugMessage("refreshSession: Returning TOKEN_THEFT_DETECTED because of core response");
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
    });
}
exports.refreshSession = refreshSession;
/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a blacklisting method. Or changed the private key to sign them.
 */
function revokeAllSessionsForUser(helpers, userId, revokeSessionsForLinkedAccounts) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield helpers.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/remove"),
            {
                userId,
                revokeSessionsForLinkedAccounts,
            }
        );
        return response.sessionHandlesRevoked;
    });
}
exports.revokeAllSessionsForUser = revokeAllSessionsForUser;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 */
function getAllSessionHandlesForUser(helpers, userId, fetchSessionsForAllLinkedAccounts) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield helpers.querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/session/user"), {
            userId,
            fetchSessionsForAllLinkedAccounts,
        });
        return response.sessionHandles;
    });
}
exports.getAllSessionHandlesForUser = getAllSessionHandlesForUser;
/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 */
function revokeSession(helpers, sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield helpers.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/remove"),
            {
                sessionHandles: [sessionHandle],
            }
        );
        return response.sessionHandlesRevoked.length === 1;
    });
}
exports.revokeSession = revokeSession;
/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 */
function revokeMultipleSessions(helpers, sessionHandles) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield helpers.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/remove"),
            {
                sessionHandles,
            }
        );
        return response.sessionHandlesRevoked;
    });
}
exports.revokeMultipleSessions = revokeMultipleSessions;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 */
function updateSessionDataInDatabase(helpers, sessionHandle, newSessionData) {
    return __awaiter(this, void 0, void 0, function* () {
        newSessionData = newSessionData === null || newSessionData === undefined ? {} : newSessionData;
        let response = yield helpers.querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/session/data"), {
            sessionHandle,
            userDataInDatabase: newSessionData,
        });
        if (response.status === "UNAUTHORISED") {
            return false;
        }
        return true;
    });
}
exports.updateSessionDataInDatabase = updateSessionDataInDatabase;
function updateAccessTokenPayload(helpers, sessionHandle, newAccessTokenPayload) {
    return __awaiter(this, void 0, void 0, function* () {
        newAccessTokenPayload =
            newAccessTokenPayload === null || newAccessTokenPayload === undefined ? {} : newAccessTokenPayload;
        let response = yield helpers.querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/jwt/data"), {
            sessionHandle,
            userDataInJWT: newAccessTokenPayload,
        });
        if (response.status === "UNAUTHORISED") {
            return false;
        }
        return true;
    });
}
exports.updateAccessTokenPayload = updateAccessTokenPayload;
