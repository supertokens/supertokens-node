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
exports.updateAccessTokenPayload = exports.updateSessionData = exports.revokeMultipleSessions = exports.revokeSession = exports.getAllSessionHandlesForUser = exports.revokeAllSessionsForUser = exports.refreshSession = exports.getSessionInformation = exports.getSession = exports.createNewSession = void 0;
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
/**
 * @description call this to "login" a user.
 */
function createNewSession(
    helpers,
    userId,
    disableAntiCsrf,
    useStaticSigningKey,
    accessTokenPayload = {},
    sessionData = {}
) {
    return __awaiter(this, void 0, void 0, function* () {
        accessTokenPayload = accessTokenPayload === null || accessTokenPayload === undefined ? {} : accessTokenPayload;
        sessionData = sessionData === null || sessionData === undefined ? {} : sessionData;
        const requestBody = {
            userId,
            userDataInJWT: accessTokenPayload,
            userDataInDatabase: sessionData,
            useStaticSigningKey,
            enableAntiCsrf: !disableAntiCsrf && helpers.config.antiCsrf === "VIA_TOKEN",
        };
        const response = yield helpers.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session"),
            requestBody
        );
        delete response.status;
        return response;
    });
}
exports.createNewSession = createNewSession;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 */
function getSession(helpers, parsedAccessToken, antiCsrfToken, doAntiCsrfCheck, containsCustomHeader, alwaysCheckCore) {
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
            let payload = parsedAccessToken.payload;
            const timeCreated = accessToken_1.sanitizeNumberInput(payload.timeCreated);
            const expiryTime = accessToken_1.sanitizeNumberInput(payload.expiryTime);
            if (expiryTime === undefined || timeCreated == undefined) {
                throw err;
            }
            if (parsedAccessToken.version < 3) {
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
                if (!containsCustomHeader) {
                    logger_1.logDebugMessage(
                        "getSession: Returning TRY_REFRESH_TOKEN because custom header (rid) was not passed"
                    );
                    throw new error_1.default({
                        message:
                            "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request, or set doAntiCsrfCheck to false for this API",
                        type: error_1.default.TRY_REFRESH_TOKEN,
                    });
                }
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
                    userDataInJWT: accessTokenInfo.userData,
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
        let response = yield helpers.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/verify"),
            requestBody
        );
        if (response.status === "OK") {
            delete response.status;
            return response;
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
            response["sessionData"] = response.userDataInDatabase;
            response["accessTokenPayload"] = response.userDataInJWT;
            delete response.userDataInJWT;
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
function refreshSession(helpers, refreshToken, antiCsrfToken, containsCustomHeader, transferMethod) {
    return __awaiter(this, void 0, void 0, function* () {
        let requestBody = {
            refreshToken,
            antiCsrfToken,
            enableAntiCsrf: transferMethod === "cookie" && helpers.config.antiCsrf === "VIA_TOKEN",
        };
        if (helpers.config.antiCsrf === "VIA_CUSTOM_HEADER" && transferMethod === "cookie") {
            if (!containsCustomHeader) {
                logger_1.logDebugMessage(
                    "refreshSession: Returning UNAUTHORISED because custom header (rid) was not passed"
                );
                throw new error_1.default({
                    message: "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request.",
                    type: error_1.default.UNAUTHORISED,
                    payload: {
                        clearTokens: false, // see https://github.com/supertokens/supertokens-node/issues/141
                    },
                });
            }
        }
        let response = yield helpers.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/refresh"),
            requestBody
        );
        if (response.status === "OK") {
            delete response.status;
            return response;
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
function revokeAllSessionsForUser(helpers, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield helpers.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/remove"),
            {
                userId,
            }
        );
        return response.sessionHandlesRevoked;
    });
}
exports.revokeAllSessionsForUser = revokeAllSessionsForUser;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 */
function getAllSessionHandlesForUser(helpers, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield helpers.querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/session/user"), {
            userId,
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
function updateSessionData(helpers, sessionHandle, newSessionData) {
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
exports.updateSessionData = updateSessionData;
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
