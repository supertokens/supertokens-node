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
/**
 * @description call this to "login" a user.
 */
function createNewSession(recipeImplementation, userId, jwtPayload = {}, sessionData = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        jwtPayload = jwtPayload === null || jwtPayload === undefined ? {} : jwtPayload;
        sessionData = sessionData === null || sessionData === undefined ? {} : sessionData;
        let requestBody = {
            userId,
            userDataInJWT: jwtPayload,
            userDataInDatabase: sessionData,
        };
        let handShakeInfo = yield recipeImplementation.getHandshakeInfo();
        requestBody.enableAntiCsrf = handShakeInfo.antiCsrf === "VIA_TOKEN";
        let response = yield recipeImplementation.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session"),
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
    });
}
exports.createNewSession = createNewSession;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 */
function getSession(recipeImplementation, accessToken, antiCsrfToken, doAntiCsrfCheck, containsCustomHeader) {
    return __awaiter(this, void 0, void 0, function* () {
        let handShakeInfo = yield recipeImplementation.getHandshakeInfo();
        let accessTokenInfo;
        /**
         * if jwtSigningPublicKeyExpiryTime is expired, we call core
         */
        if (handShakeInfo.jwtSigningPublicKeyExpiryTime > Date.now()) {
            try {
                /**
                 * get access token info using existing signingKey
                 */
                accessTokenInfo = yield accessToken_1.getInfoFromAccessToken(
                    accessToken,
                    handShakeInfo.jwtSigningPublicKey,
                    handShakeInfo.antiCsrf === "VIA_TOKEN" && doAntiCsrfCheck
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
                 * if access token creation time is after the signing key was last
                 * updated, we need to call core as there are chances that the token
                 * was signed with the updated signing key
                 *
                 * if access token creation time is before the signing key was last
                 * updated, we just return TRY_REFRESH_TOKEN to the client
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
                let expiryTime = accessToken_1.sanitizeNumberInput(payload.expiryTime);
                let timeCreated = accessToken_1.sanitizeNumberInput(payload.timeCreated);
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
                            throw new error_1.default({
                                message:
                                    "Provided antiCsrfToken is undefined. If you do not want anti-csrf check for this API, please set doAntiCsrfCheck to false for this API",
                                type: error_1.default.TRY_REFRESH_TOKEN,
                            });
                        } else {
                            throw new error_1.default({
                                message: "anti-csrf check failed",
                                type: error_1.default.TRY_REFRESH_TOKEN,
                            });
                        }
                    }
                }
            } else if (handShakeInfo.antiCsrf === "VIA_CUSTOM_HEADER") {
                if (!containsCustomHeader) {
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
        let response = yield recipeImplementation.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/verify"),
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
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
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
                yield recipeImplementation.getHandshakeInfo(true);
            }
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
 * @returns session data stored in the database, including userData and JWT payload
 */
function getSessionInformation(recipeImplementation, sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeImplementation.querier.sendGetRequest(
            new normalisedURLPath_1.default("/recipe/session"),
            {
                sessionHandle,
            }
        );
        if (response.status === "OK") {
            return response;
        } else {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            });
        }
    });
}
exports.getSessionInformation = getSessionInformation;
/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 */
function refreshSession(recipeImplementation, refreshToken, antiCsrfToken, containsCustomHeader) {
    return __awaiter(this, void 0, void 0, function* () {
        let handShakeInfo = yield recipeImplementation.getHandshakeInfo();
        let requestBody = {
            refreshToken,
            antiCsrfToken,
            enableAntiCsrf: handShakeInfo.antiCsrf === "VIA_TOKEN",
        };
        if (handShakeInfo.antiCsrf === "VIA_CUSTOM_HEADER") {
            if (!containsCustomHeader) {
                throw new error_1.default({
                    message: "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request.",
                    type: error_1.default.UNAUTHORISED,
                    payload: {
                        clearCookies: false,
                    },
                });
            }
        }
        let response = yield recipeImplementation.querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/refresh"),
            requestBody
        );
        if (response.status === "OK") {
            delete response.status;
            return response;
        } else if (response.status === "UNAUTHORISED") {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            });
        } else {
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
function revokeAllSessionsForUser(recipeImplementation, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeImplementation.querier.sendPostRequest(
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
function getAllSessionHandlesForUser(recipeImplementation, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeImplementation.querier.sendGetRequest(
            new normalisedURLPath_1.default("/recipe/session/user"),
            {
                userId,
            }
        );
        return response.sessionHandles;
    });
}
exports.getAllSessionHandlesForUser = getAllSessionHandlesForUser;
/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 */
function revokeSession(recipeImplementation, sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeImplementation.querier.sendPostRequest(
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
function revokeMultipleSessions(recipeImplementation, sessionHandles) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeImplementation.querier.sendPostRequest(
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
 * @deprecated use getSessionInformation() instead
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
 * @returns session data as provided by the user earlier
 */
function getSessionData(recipeImplementation, sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeImplementation.querier.sendGetRequest(
            new normalisedURLPath_1.default("/recipe/session/data"),
            {
                sessionHandle,
            }
        );
        if (response.status === "OK") {
            return response.userDataInDatabase;
        } else {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            });
        }
    });
}
exports.getSessionData = getSessionData;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 */
function updateSessionData(recipeImplementation, sessionHandle, newSessionData) {
    return __awaiter(this, void 0, void 0, function* () {
        newSessionData = newSessionData === null || newSessionData === undefined ? {} : newSessionData;
        let response = yield recipeImplementation.querier.sendPutRequest(
            new normalisedURLPath_1.default("/recipe/session/data"),
            {
                sessionHandle,
                userDataInDatabase: newSessionData,
            }
        );
        if (response.status === "UNAUTHORISED") {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            });
        }
    });
}
exports.updateSessionData = updateSessionData;
/**
 * @deprecated use getSessionInformation() instead
 * @returns jwt payload as provided by the user earlier
 */
function getJWTPayload(recipeImplementation, sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeImplementation.querier.sendGetRequest(
            new normalisedURLPath_1.default("/recipe/jwt/data"),
            {
                sessionHandle,
            }
        );
        if (response.status === "OK") {
            return response.userDataInJWT;
        } else {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            });
        }
    });
}
exports.getJWTPayload = getJWTPayload;
function updateJWTPayload(recipeImplementation, sessionHandle, newJWTPayload) {
    return __awaiter(this, void 0, void 0, function* () {
        newJWTPayload = newJWTPayload === null || newJWTPayload === undefined ? {} : newJWTPayload;
        let response = yield recipeImplementation.querier.sendPutRequest(
            new normalisedURLPath_1.default("/recipe/jwt/data"),
            {
                sessionHandle,
                userDataInJWT: newJWTPayload,
            }
        );
        if (response.status === "UNAUTHORISED") {
            throw new error_1.default({
                message: response.message,
                type: error_1.default.UNAUTHORISED,
            });
        }
    });
}
exports.updateJWTPayload = updateJWTPayload;
//# sourceMappingURL=sessionFunctions.js.map
