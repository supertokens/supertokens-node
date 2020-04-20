"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function(resolve, reject) {
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
                result.done
                    ? resolve(result.value)
                    : new P(function(resolve) {
                          resolve(result.value);
                      }).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
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
const accessToken_1 = require("./accessToken");
const error_1 = require("./error");
const handshakeInfo_1 = require("./handshakeInfo");
const processState_1 = require("./processState");
const querier_1 = require("./querier");
var error_2 = require("./error");
exports.Error = error_2.AuthError;
/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * Please create a database in your mysql instance before calling this function
 * @throws AuthError GENERAL_ERROR in case anything fails.
 */
function init(hosts) {
    querier_1.Querier.initInstance(hosts);
    // this will also call the api version API
    handshakeInfo_1.HandshakeInfo.getInstance().catch(err => {
        // ignored
    });
}
exports.init = init;
/**
 * @description call this to "login" a user.
 * @throws GENERAL_ERROR in case anything fails.
 */
function createNewSession(userId, jwtPayload = {}, sessionData = {}) {
    return __awaiter(this, void 0, void 0, function*() {
        let response = yield querier_1.Querier.getInstance().sendPostRequest("/session", {
            userId,
            userDataInJWT: jwtPayload,
            userDataInDatabase: sessionData
        });
        let instance = yield handshakeInfo_1.HandshakeInfo.getInstance();
        instance.updateJwtSigningPublicKeyInfo(response.jwtSigningPublicKey, response.jwtSigningPublicKeyExpiryTime);
        delete response.status;
        delete response.jwtSigningPublicKey;
        delete response.jwtSigningPublicKeyExpiryTime;
        if ((yield querier_1.Querier.getInstance().getAPIVersion()) === "1.0") {
            return Object.assign({}, response, {
                accessToken: Object.assign({}, response.accessToken, { sameSite: "none" }),
                refreshToken: Object.assign({}, response.refreshToken, { sameSite: "none" }),
                idRefreshToken: Object.assign({}, response.idRefreshToken, {
                    cookiePath: response.accessToken.cookiePath,
                    cookieSecure: response.accessToken.cookieSecure,
                    domain: response.accessToken.domain,
                    sameSite: "none"
                })
            });
        } else {
            return response;
        }
    });
}
exports.createNewSession = createNewSession;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED and TRY_REFRESH_TOKEN
 */
function getSession(accessToken, antiCsrfToken, doAntiCsrfCheck, idRefreshToken) {
    return __awaiter(this, void 0, void 0, function*() {
        if (idRefreshToken === undefined) {
            throw error_1.generateError(error_1.AuthError.UNAUTHORISED, new Error("idRefreshToken missing"));
        }
        let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
        try {
            if (handShakeInfo.jwtSigningPublicKeyExpiryTime > Date.now()) {
                let accessTokenInfo = yield accessToken_1.getInfoFromAccessToken(
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
                        throw error_1.generateError(
                            error_1.AuthError.TRY_REFRESH_TOKEN,
                            new Error(
                                "provided antiCsrfToken is undefined. If you do not want anti-csrf check for this API, please set doAntiCsrfCheck to true"
                            )
                        );
                    } else {
                        throw error_1.generateError(
                            error_1.AuthError.TRY_REFRESH_TOKEN,
                            new Error("anti-csrf check failed")
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
                            userDataInJWT: accessTokenInfo.userData
                        }
                    };
                }
            }
        } catch (err) {
            if (!error_1.AuthError.isErrorFromAuth(err) || err.errType !== error_1.AuthError.TRY_REFRESH_TOKEN) {
                // if error is try refresh token, we call the actual API.
                throw err;
            }
        }
        processState_1.ProcessState.getInstance().addState(processState_1.PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        let response = yield querier_1.Querier.getInstance().sendPostRequest("/session/verify", {
            accessToken,
            antiCsrfToken,
            doAntiCsrfCheck
        });
        if (response.status == "OK") {
            let instance = yield handshakeInfo_1.HandshakeInfo.getInstance();
            instance.updateJwtSigningPublicKeyInfo(
                response.jwtSigningPublicKey,
                response.jwtSigningPublicKeyExpiryTime
            );
            delete response.status;
            delete response.jwtSigningPublicKey;
            delete response.jwtSigningPublicKeyExpiryTime;
            if (
                (yield querier_1.Querier.getInstance().getAPIVersion()) === "1.0" &&
                response.accessToken !== undefined
            ) {
                return Object.assign({}, response, {
                    accessToken: Object.assign({}, response.accessToken, { sameSite: "none" })
                });
            } else {
                return response;
            }
        } else if (response.status == "UNAUTHORISED") {
            throw error_1.generateError(error_1.AuthError.UNAUTHORISED, new Error(response.message));
        } else {
            throw error_1.generateError(error_1.AuthError.TRY_REFRESH_TOKEN, new Error(response.message));
        }
    });
}
exports.getSession = getSession;
/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 */
function refreshSession(refreshToken) {
    return __awaiter(this, void 0, void 0, function*() {
        let response = yield querier_1.Querier.getInstance().sendPostRequest("/session/refresh", {
            refreshToken
        });
        if (response.status == "OK") {
            delete response.status;
            if ((yield querier_1.Querier.getInstance().getAPIVersion()) === "1.0") {
                return Object.assign({}, response, {
                    accessToken: Object.assign({}, response.accessToken, { sameSite: "none" }),
                    refreshToken: Object.assign({}, response.refreshToken, { sameSite: "none" }),
                    idRefreshToken: Object.assign({}, response.idRefreshToken, {
                        cookiePath: response.accessToken.cookiePath,
                        cookieSecure: response.accessToken.cookieSecure,
                        domain: response.accessToken.domain,
                        sameSite: "none"
                    })
                });
            } else {
                return response;
            }
        } else if (response.status == "UNAUTHORISED") {
            throw error_1.generateError(error_1.AuthError.UNAUTHORISED, new Error(response.message));
        } else {
            throw error_1.generateError(error_1.AuthError.TOKEN_THEFT_DETECTED, {
                sessionHandle: response.session.handle,
                userId: response.session.userId
            });
        }
    });
}
exports.refreshSession = refreshSession;
/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a bloacklisting method. Or changed the private key to sign them.
 * @throws AuthError, GENERAL_ERROR
 */
function revokeAllSessionsForUser(userId) {
    return __awaiter(this, void 0, void 0, function*() {
        if ((yield querier_1.Querier.getInstance().getAPIVersion()) === "1.0") {
            let response = yield querier_1.Querier.getInstance().sendDeleteRequest("/session", {
                userId
            });
            return response.numberOfSessionsRevoked;
        } else {
            let response = yield querier_1.Querier.getInstance().sendPostRequest("/session/remove", {
                userId
            });
            return response.sessionHandlesRevoked;
        }
    });
}
exports.revokeAllSessionsForUser = revokeAllSessionsForUser;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
function getAllSessionHandlesForUser(userId) {
    return __awaiter(this, void 0, void 0, function*() {
        let response = yield querier_1.Querier.getInstance().sendGetRequest("/session/user", {
            userId
        });
        return response.sessionHandles;
    });
}
exports.getAllSessionHandlesForUser = getAllSessionHandlesForUser;
/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
function revokeSessionUsingSessionHandle(sessionHandle) {
    return __awaiter(this, void 0, void 0, function*() {
        if ((yield querier_1.Querier.getInstance().getAPIVersion()) === "1.0") {
            let response = yield querier_1.Querier.getInstance().sendDeleteRequest("/session", {
                sessionHandle
            });
            return response.numberOfSessionsRevoked == 1;
        } else {
            let response = yield querier_1.Querier.getInstance().sendPostRequest("/session/remove", {
                sessionHandles: [sessionHandle]
            });
            return response.sessionHandlesRevoked.length === 1;
        }
    });
}
exports.revokeSessionUsingSessionHandle = revokeSessionUsingSessionHandle;
/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
function revokeMultipleSessionsUsingSessionHandles(sessionHandles) {
    return __awaiter(this, void 0, void 0, function*() {
        if ((yield querier_1.Querier.getInstance().getAPIVersion()) === "1.0") {
            let response = yield querier_1.Querier.getInstance().sendDeleteRequest("/session", {
                sessionHandles
            });
            return response.numberOfSessionsRevoked;
        } else {
            let response = yield querier_1.Querier.getInstance().sendPostRequest("/session/remove", {
                sessionHandles
            });
            return response.sessionHandlesRevoked;
        }
    });
}
exports.revokeMultipleSessionsUsingSessionHandles = revokeMultipleSessionsUsingSessionHandles;
/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function getSessionData(sessionHandle) {
    return __awaiter(this, void 0, void 0, function*() {
        let response = yield querier_1.Querier.getInstance().sendGetRequest("/session/data", {
            sessionHandle
        });
        if (response.status == "OK") {
            return response.userDataInDatabase;
        } else {
            throw error_1.generateError(error_1.AuthError.UNAUTHORISED, new Error(response.message));
        }
    });
}
exports.getSessionData = getSessionData;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function updateSessionData(sessionHandle, newSessionData) {
    return __awaiter(this, void 0, void 0, function*() {
        let response = yield querier_1.Querier.getInstance().sendPutRequest("/session/data", {
            sessionHandle,
            userDataInDatabase: newSessionData
        });
        if (response.status == "UNAUTHORISED") {
            throw error_1.generateError(error_1.AuthError.UNAUTHORISED, new Error(response.message));
        }
    });
}
exports.updateSessionData = updateSessionData;
//# sourceMappingURL=session.js.map
