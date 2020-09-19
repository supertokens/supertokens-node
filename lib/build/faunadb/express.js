"use strict";
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
const cookieAndHeaders_1 = require("../cookieAndHeaders");
const OriginalExpress = require("../");
/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * Please create a database in your mongo instance before calling this function
 * @param config
 * @param client: mongo client. Default is undefined. If you provide this, please make sure that it is already connected to the right database that has the auth collections. If you do not provide this, then the library will manage its own connection.
 */
function init(config) {
    return OriginalExpress.init(config);
}
exports.init = init;
/**
 * @description call this to "login" a user. This overwrites any existing session that exists.
 * To check if a session exists, call getSession function.
 * @throws GENERAL_ERROR in case anything fails.
 * @sideEffect sets cookies in res
 */
function createNewSession(res, userId, jwtPayload = {}, sessionData = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.createNewSession(res, userId, jwtPayload, sessionData);
    });
}
exports.createNewSession = createNewSession;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED and TRY_REFRESH_TOKEN
 * @sideEffects may remove cookies, or change the accessToken.
 */
function getSession(req, res, doAntiCsrfCheck) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.getSession(req, res, doAntiCsrfCheck);
    });
}
exports.getSession = getSession;
/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 * @sideEffects may remove cookies, or change the accessToken and refreshToken.
 */
function refreshSession(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.refreshSession(req, res);
    });
}
exports.refreshSession = refreshSession;
/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated, unless we enable a blacklisting. Or changed the private key to sign them.
 * @throws AuthError, GENERAL_ERROR
 */
function revokeAllSessionsForUser(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.revokeAllSessionsForUser(userId);
    });
}
exports.revokeAllSessionsForUser = revokeAllSessionsForUser;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
function getAllSessionHandlesForUser(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.getAllSessionHandlesForUser(userId);
    });
}
exports.getAllSessionHandlesForUser = getAllSessionHandlesForUser;
/**
 * @description call to destroy one session. This will not clear cookies, so if you have a Session object, please use that.
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
function revokeSession(sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.revokeSession(sessionHandle);
    });
}
exports.revokeSession = revokeSession;
/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
function revokeMultipleSessions(sessionHandles) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.revokeMultipleSessions(sessionHandles);
    });
}
exports.revokeMultipleSessions = revokeMultipleSessions;
/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself. If you have a Session object, please use that instead.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function getSessionData(sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.getSessionData(sessionHandle);
    });
}
exports.getSessionData = getSessionData;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well. If you have a Session object, please use that instead.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function updateSessionData(sessionHandle, newSessionData) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.updateSessionData(sessionHandle, newSessionData);
    });
}
exports.updateSessionData = updateSessionData;
/**
 * @description Sets relevant Access-Control-Allow-Headers and Access-Control-Allow-Credentials headers
 */
function setRelevantHeadersForOptionsAPI(res) {
    return OriginalExpress.setRelevantHeadersForOptionsAPI(res);
}
exports.setRelevantHeadersForOptionsAPI = setRelevantHeadersForOptionsAPI;
/**
 * @description Used to set relevant CORS Access-Control-Allowed-Headers
 */
function getCORSAllowedHeaders() {
    return cookieAndHeaders_1.getCORSAllowedHeaders();
}
exports.getCORSAllowedHeaders = getCORSAllowedHeaders;
/**
 * @returns jwt payload as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function getJWTPayload(sessionHandle) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.getJWTPayload(sessionHandle);
    });
}
exports.getJWTPayload = getJWTPayload;
/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function updateJWTPayload(sessionHandle, newJWTPayload) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.updateJWTPayload(sessionHandle, newJWTPayload);
    });
}
exports.updateJWTPayload = updateJWTPayload;
function auth0Handler(request, response, next, domain, clientId, clientSecret, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        return OriginalExpress.auth0Handler(request, response, next, domain, clientId, clientSecret, callback);
    });
}
exports.auth0Handler = auth0Handler;
/**
 * @class Session
 * @description an instance of this is created when a session is valid.
 */
class Session extends OriginalExpress.Session {
    constructor(accessToken, sessionHandle, userId, userDataInJWT, res) {
        super(accessToken, sessionHandle, userId, userDataInJWT, res);
    }
}
exports.Session = Session;
//# sourceMappingURL=express.js.map
