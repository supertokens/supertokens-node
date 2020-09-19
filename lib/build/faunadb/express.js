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
const faunadb = require("faunadb");
const utils_1 = require("../utils");
const SessionFunctions = require("../session");
const error_1 = require("../error");
let accessFaunaDBTokenFromFrontend;
let faunaDBClient;
let userCollectionName;
const FAUNADB_TOKEN_TIME_LAG_MILLI = 30 * 1000;
const FAUNADB_SESSION_KEY = "faunadbToken";
const q = faunadb.query;
/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * @param config
 */
function init(config) {
    faunaDBClient = new faunadb.Client({
        secret: config.faunadbSecret,
    });
    userCollectionName = config.userCollectionName;
    accessFaunaDBTokenFromFrontend =
        config.accessFaunadbTokenFromFrontend === undefined ? false : config.accessFaunadbTokenFromFrontend;
    return OriginalExpress.init(config);
}
exports.init = init;
/**
 * @description call this to "login" a user. This overwrites any existing session that exists.
 * To check if a session exists, call getSession function.
 * @throws GENERAL_ERROR in case anything fails.
 * @sideEffect sets cookies in res
 */
// TODO: HandshakeInfo should give the access token lifetime so that we do not have to do a double query
function createNewSession(res, userId, jwtPayload = {}, sessionData = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield SessionFunctions.createNewSession(userId, jwtPayload, sessionData);
        utils_1.attachCreateOrRefreshSessionResponseToExpressRes(res, response);
        let session = new Session(
            response.accessToken.token,
            response.session.handle,
            response.session.userId,
            response.session.userDataInJWT,
            res
        );
        try {
            let accessTokenLifetime = response.accessToken.expiry - Date.now();
            let faunaResponse = yield faunaDBClient.query(
                q.Create(q.Tokens(), {
                    instance: q.Ref(q.Collection(userCollectionName), userId),
                    ttl: q.TimeAdd(q.Now(), accessTokenLifetime + FAUNADB_TOKEN_TIME_LAG_MILLI, "millisecond"),
                })
            );
            let fdat = faunaResponse.secret; // faunadb access token
            if (accessFaunaDBTokenFromFrontend) {
                let newPayload = Object.assign({}, jwtPayload);
                newPayload[FAUNADB_SESSION_KEY] = fdat;
                yield session.updateJWTPayload(newPayload);
            } else {
                let newPayload = Object.assign({}, sessionData);
                newPayload[FAUNADB_SESSION_KEY] = fdat;
                yield session.updateSessionData(newPayload);
            }
            return session;
        } catch (err) {
            console.log(err);
            throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, err);
        }
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
        let originalSession = yield OriginalExpress.getSession(req, res, doAntiCsrfCheck);
        return new Session(
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            res
        );
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
        let originalSession = yield OriginalExpress.refreshSession(req, res);
        return new Session(
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            res
        );
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
        this.getFaunadbToken = () =>
            __awaiter(this, void 0, void 0, function* () {
                let jwtPayload = this.getJWTPayload();
                if (jwtPayload[FAUNADB_SESSION_KEY] !== undefined) {
                    // this operation costs nothing. So we can check
                    return jwtPayload[FAUNADB_SESSION_KEY];
                } else {
                    let sessionData = yield this.getSessionData();
                    return sessionData[FAUNADB_SESSION_KEY];
                }
            });
    }
}
exports.Session = Session;
//# sourceMappingURL=express.js.map
