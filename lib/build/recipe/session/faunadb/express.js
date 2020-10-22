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
const OriginalExpress = require("../express");
const faunadb = require("faunadb");
const error_1 = require("../error");
const middleware_1 = require("./middleware");
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
    OriginalExpress.init(config);
    faunaDBClient = new faunadb.Client({
        secret: config.faunadbSecret,
    });
    userCollectionName = config.userCollectionName;
    accessFaunaDBTokenFromFrontend =
        config.accessFaunadbTokenFromFrontend === undefined ? false : config.accessFaunadbTokenFromFrontend;
    return middleware_1.autoRefreshMiddleware();
}
exports.init = init;
function getFaunadbTokenTimeLag() {
    if (process.env.INSTALL_PATH !== undefined) {
        // if in testing...
        return 2 * 1000;
    }
    return FAUNADB_TOKEN_TIME_LAG_MILLI;
}
function getFDAT(session) {
    return __awaiter(this, void 0, void 0, function* () {
        let accessTokenExpiry = session.getAccessTokenExpiry();
        if (accessTokenExpiry === undefined) {
            throw new Error("Should not come here");
        }
        let accessTokenLifetime = accessTokenExpiry - Date.now();
        let faunaResponse = yield faunaDBClient.query(
            q.Create(q.Tokens(), {
                instance: q.Ref(q.Collection(userCollectionName), session.getUserId()),
                ttl: q.TimeAdd(q.Now(), accessTokenLifetime + getFaunadbTokenTimeLag(), "millisecond"),
            })
        );
        return faunaResponse.secret;
    });
}
/**
 * @description call this to "login" a user. This overwrites any existing session that exists.
 * To check if a session exists, call getSession function.
 * @throws GENERAL_ERROR in case anything fails.
 * @sideEffect sets cookies in res
 */
function createNewSession(res, userId, jwtPayload = {}, sessionData = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: HandshakeInfo should give the access token lifetime so that we do not have to do a double query
        let originalSession = yield OriginalExpress.createNewSession(res, userId, jwtPayload, sessionData);
        let session = new Session(
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            originalSession.getAccessTokenExpiry(), // TODO: remove this field from session once handshake info has access token expiry
            res
        );
        try {
            let fdat = yield getFDAT(session);
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
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                payload: err,
            });
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
            originalSession.getAccessTokenExpiry(),
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
        let session = new Session(
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            originalSession.getAccessTokenExpiry(),
            res
        );
        try {
            let fdat = yield getFDAT(session);
            // we do not use the accessFaunaDBTokenFromFrontend boolean here so that
            // it can be changed without affecting existing sessions.
            if (session.getJWTPayload()[FAUNADB_SESSION_KEY] !== undefined) {
                let newPayload = Object.assign({}, session.getJWTPayload());
                newPayload[FAUNADB_SESSION_KEY] = fdat;
                yield session.updateJWTPayload(newPayload);
            } else {
                let newPayload = Object.assign({}, yield session.getSessionData());
                newPayload[FAUNADB_SESSION_KEY] = fdat;
                yield session.updateSessionData(newPayload);
            }
            return session;
        } catch (err) {
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                payload: err,
            });
        }
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
    return OriginalExpress.getCORSAllowedHeaders();
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
/**
 * @class Session
 * @description an instance of this is created when a session is valid.
 */
class Session extends OriginalExpress.Session {
    constructor(accessToken, sessionHandle, userId, userDataInJWT, accessTokenExpiry, res) {
        super(accessToken, sessionHandle, userId, userDataInJWT, accessTokenExpiry, res);
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
