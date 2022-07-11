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
Object.defineProperty(exports, "__esModule", { value: true });
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
const jwt_1 = require("./jwt");
const error_1 = require("./error");
const processState_1 = require("../../processState");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const utils_1 = require("../../utils");
const logger_1 = require("../../logger");
/**
 * @description call this to "login" a user.
 */
function createNewSession(helpers, userId, accessTokenPayload = {}, sessionData = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        accessTokenPayload = accessTokenPayload === null || accessTokenPayload === undefined ? {} : accessTokenPayload;
        sessionData = sessionData === null || sessionData === undefined ? {} : sessionData;
        let requestBody = {
            userId,
            userDataInJWT: accessTokenPayload,
            userDataInDatabase: sessionData,
        };
        let handShakeInfo = yield helpers.getHandshakeInfo();
        requestBody.enableAntiCsrf = handShakeInfo.antiCsrf === "VIA_TOKEN";
        let response = yield helpers.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session"),
            requestBody
        );
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
    });
}
exports.createNewSession = createNewSession;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 */
function getSession(helpers, accessToken, antiCsrfToken, doAntiCsrfCheck, containsCustomHeader) {
    return __awaiter(this, void 0, void 0, function* () {
        let handShakeInfo = yield helpers.getHandshakeInfo();
        let accessTokenInfo;
        // If we have no key old enough to verify this access token we should reject it without calling the core
        let foundASigningKeyThatIsOlderThanTheAccessToken = false;
        for (const key of handShakeInfo.getJwtSigningPublicKeyList()) {
            try {
                /**
                 * get access token info using existing signingKey
                 */
                accessTokenInfo = yield accessToken_1.getInfoFromAccessToken(
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
                let payload;
                try {
                    payload = jwt_1.getPayloadWithoutVerifiying(accessToken);
                } catch (_) {
                    throw err;
                }
                if (payload === undefined) {
                    throw err;
                }
                const timeCreated = accessToken_1.sanitizeNumberInput(payload.timeCreated);
                const expiryTime = accessToken_1.sanitizeNumberInput(payload.expiryTime);
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
            throw new error_1.default({
                message: "Access token has expired. Please call the refresh API",
                type: error_1.default.TRY_REFRESH_TOKEN,
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
            } else if (handShakeInfo.antiCsrf === "VIA_CUSTOM_HEADER") {
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
        processState_1.ProcessState.getInstance().addState(processState_1.PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        let requestBody = {
            accessToken,
            antiCsrfToken,
            doAntiCsrfCheck,
            enableAntiCsrf: handShakeInfo.antiCsrf === "VIA_TOKEN",
        };
        let response = yield helpers.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/verify"),
            requestBody
        );
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
            logger_1.logDebugMessage("getSession: Returning UNAUTHORISED because of core response");
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
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
                yield helpers.getHandshakeInfo(true);
            }
            logger_1.logDebugMessage("getSession: Returning TRY_REFRESH_TOKEN because of core response");
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
function refreshSession(helpers, refreshToken, antiCsrfToken, containsCustomHeader) {
    return __awaiter(this, void 0, void 0, function* () {
        let handShakeInfo = yield helpers.getHandshakeInfo();
        let requestBody = {
            refreshToken,
            antiCsrfToken,
            enableAntiCsrf: handShakeInfo.antiCsrf === "VIA_TOKEN",
        };
        if (handShakeInfo.antiCsrf === "VIA_CUSTOM_HEADER") {
            if (!containsCustomHeader) {
                logger_1.logDebugMessage(
                    "refreshSession: Returning UNAUTHORISED because custom header (rid) was not passed"
                );
                throw new error_1.default({
                    message: "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request.",
                    type: error_1.default.UNAUTHORISED,
                    payload: {
                        clearCookies: false,
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
