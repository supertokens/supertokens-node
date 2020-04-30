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
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const error_1 = require("./error");
const handshakeInfo_1 = require("./handshakeInfo");
const SessionFunctions = require("./session");
const querier_1 = require("./querier");
// TODO: Make it also work with PassportJS
/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * Please create a database in your mongo instance before calling this function
 * @param config
 * @param client: mongo client. Default is undefined. If you provide this, please make sure that it is already connected to the right database that has the auth collections. If you do not provide this, then the library will manage its own connection.
 * @throws AuthError GENERAL_ERROR in case anything fails.
 */
function init(hosts) {
    SessionFunctions.init(hosts);
}
exports.init = init;
/**
 * @description call this to "login" a user. This overwrites any existing session that exists.
 * To check if a session exists, call getSession function.
 * @throws GENERAL_ERROR in case anything fails.
 * @sideEffect sets cookies in res
 */
function createNewSession(res, userId, jwtPayload = {}, sessionData = {}) {
    return __awaiter(this, void 0, void 0, function*() {
        let response = yield SessionFunctions.createNewSession(userId, jwtPayload, sessionData);
        // attach tokens to cookies
        let accessToken = response.accessToken;
        let refreshToken = response.refreshToken;
        let idRefreshToken = response.idRefreshToken;
        cookieAndHeaders_1.attachAccessTokenToCookie(
            res,
            accessToken.token,
            accessToken.expiry,
            accessToken.domain,
            accessToken.cookiePath,
            accessToken.cookieSecure,
            accessToken.sameSite
        );
        cookieAndHeaders_1.attachRefreshTokenToCookie(
            res,
            refreshToken.token,
            refreshToken.expiry,
            refreshToken.domain,
            refreshToken.cookiePath,
            refreshToken.cookieSecure,
            refreshToken.sameSite
        );
        cookieAndHeaders_1.setIdRefreshTokenInHeaderAndCookie(
            res,
            idRefreshToken.token,
            idRefreshToken.expiry,
            idRefreshToken.domain,
            idRefreshToken.cookieSecure,
            idRefreshToken.cookiePath,
            idRefreshToken.sameSite
        );
        if (response.antiCsrfToken !== undefined) {
            cookieAndHeaders_1.setAntiCsrfTokenInHeaders(res, response.antiCsrfToken);
        }
        return new Session(
            accessToken.token,
            response.session.handle,
            response.session.userId,
            response.session.userDataInJWT,
            res
        );
    });
}
exports.createNewSession = createNewSession;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED and TRY_REFRESH_TOKEN
 * @sideEffects may remove cookies, or change the accessToken.
 */
function getSession(req, res, doAntiCsrfCheck) {
    return __awaiter(this, void 0, void 0, function*() {
        cookieAndHeaders_1.saveFrontendInfoFromRequest(req);
        let accessToken = cookieAndHeaders_1.getAccessTokenFromCookie(req);
        if (accessToken === undefined) {
            // maybe the access token has expired.
            throw error_1.generateError(
                error_1.AuthError.TRY_REFRESH_TOKEN,
                new Error("access token missing in cookies")
            );
        }
        try {
            let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
            let idRefreshToken = cookieAndHeaders_1.getIdRefreshTokenFromCookie(req);
            let response = yield SessionFunctions.getSession(
                accessToken,
                antiCsrfToken,
                doAntiCsrfCheck,
                idRefreshToken
            );
            if (response.accessToken !== undefined) {
                cookieAndHeaders_1.attachAccessTokenToCookie(
                    res,
                    response.accessToken.token,
                    response.accessToken.expiry,
                    response.accessToken.domain,
                    response.accessToken.cookiePath,
                    response.accessToken.cookieSecure,
                    response.accessToken.sameSite
                );
                accessToken = response.accessToken.token;
            }
            return new Session(
                accessToken,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                res
            );
        } catch (err) {
            if (error_1.AuthError.isErrorFromAuth(err) && err.errType === error_1.AuthError.UNAUTHORISED) {
                let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
                cookieAndHeaders_1.clearSessionFromCookie(
                    res,
                    handShakeInfo.cookieDomain,
                    handShakeInfo.cookieSecure,
                    handShakeInfo.accessTokenPath,
                    handShakeInfo.refreshTokenPath,
                    handShakeInfo.idRefreshTokenPath,
                    handShakeInfo.cookieSameSite
                );
            }
            throw err;
        }
    });
}
exports.getSession = getSession;
/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 * @sideEffects may remove cookies, or change the accessToken and refreshToken.
 */
function refreshSession(req, res) {
    return __awaiter(this, void 0, void 0, function*() {
        cookieAndHeaders_1.saveFrontendInfoFromRequest(req);
        let inputRefreshToken = cookieAndHeaders_1.getRefreshTokenFromCookie(req);
        if (inputRefreshToken === undefined) {
            let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
            cookieAndHeaders_1.clearSessionFromCookie(
                res,
                handShakeInfo.cookieDomain,
                handShakeInfo.cookieSecure,
                handShakeInfo.accessTokenPath,
                handShakeInfo.refreshTokenPath,
                handShakeInfo.idRefreshTokenPath,
                handShakeInfo.cookieSameSite
            );
            throw error_1.generateError(
                error_1.AuthError.UNAUTHORISED,
                new Error(
                    "Missing auth tokens in cookies. Have you set the correct refresh API path in your frontend and SuperTokens config?"
                )
            );
        }
        try {
            let response = yield SessionFunctions.refreshSession(inputRefreshToken);
            // attach tokens to cookies
            let accessToken = response.accessToken;
            let refreshToken = response.refreshToken;
            let idRefreshToken = response.idRefreshToken;
            cookieAndHeaders_1.attachAccessTokenToCookie(
                res,
                accessToken.token,
                accessToken.expiry,
                accessToken.domain,
                accessToken.cookiePath,
                accessToken.cookieSecure,
                accessToken.sameSite
            );
            cookieAndHeaders_1.attachRefreshTokenToCookie(
                res,
                refreshToken.token,
                refreshToken.expiry,
                refreshToken.domain,
                refreshToken.cookiePath,
                refreshToken.cookieSecure,
                refreshToken.sameSite
            );
            cookieAndHeaders_1.setIdRefreshTokenInHeaderAndCookie(
                res,
                idRefreshToken.token,
                idRefreshToken.expiry,
                idRefreshToken.domain,
                idRefreshToken.cookieSecure,
                idRefreshToken.cookiePath,
                idRefreshToken.sameSite
            );
            if (response.antiCsrfToken !== undefined) {
                cookieAndHeaders_1.setAntiCsrfTokenInHeaders(res, response.antiCsrfToken);
            }
            return new Session(
                accessToken.token,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                res
            );
        } catch (err) {
            if (
                error_1.AuthError.isErrorFromAuth(err) &&
                (err.errType === error_1.AuthError.UNAUTHORISED ||
                    err.errType === error_1.AuthError.TOKEN_THEFT_DETECTED)
            ) {
                let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
                cookieAndHeaders_1.clearSessionFromCookie(
                    res,
                    handShakeInfo.cookieDomain,
                    handShakeInfo.cookieSecure,
                    handShakeInfo.accessTokenPath,
                    handShakeInfo.refreshTokenPath,
                    handShakeInfo.idRefreshTokenPath,
                    handShakeInfo.cookieSameSite
                );
            }
            throw err;
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
    return __awaiter(this, void 0, void 0, function*() {
        return SessionFunctions.revokeAllSessionsForUser(userId);
    });
}
exports.revokeAllSessionsForUser = revokeAllSessionsForUser;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
function getAllSessionHandlesForUser(userId) {
    return __awaiter(this, void 0, void 0, function*() {
        return SessionFunctions.getAllSessionHandlesForUser(userId);
    });
}
exports.getAllSessionHandlesForUser = getAllSessionHandlesForUser;
/**
 * @description call to destroy one session. This will not clear cookies, so if you have a Session object, please use that.
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
function revokeSession(sessionHandle) {
    return __awaiter(this, void 0, void 0, function*() {
        return SessionFunctions.revokeSession(sessionHandle);
    });
}
exports.revokeSession = revokeSession;
/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
function revokeMultipleSessions(sessionHandles) {
    return __awaiter(this, void 0, void 0, function*() {
        return SessionFunctions.revokeMultipleSessions(sessionHandles);
    });
}
exports.revokeMultipleSessions = revokeMultipleSessions;
/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself. If you have a Session object, please use that instead.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function getSessionData(sessionHandle) {
    return __awaiter(this, void 0, void 0, function*() {
        return SessionFunctions.getSessionData(sessionHandle);
    });
}
exports.getSessionData = getSessionData;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well. If you have a Session object, please use that instead.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function updateSessionData(sessionHandle, newSessionData) {
    return __awaiter(this, void 0, void 0, function*() {
        return SessionFunctions.updateSessionData(sessionHandle, newSessionData);
    });
}
exports.updateSessionData = updateSessionData;
/**
 * @description Sets relevant Access-Control-Allow-Headers and Access-Control-Allow-Credentials headers
 */
function setRelevantHeadersForOptionsAPI(res) {
    cookieAndHeaders_1.setOptionsAPIHeader(res);
}
exports.setRelevantHeadersForOptionsAPI = setRelevantHeadersForOptionsAPI;
/**
 * @returns jwt payload as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function getJWTPayload(sessionHandle) {
    return __awaiter(this, void 0, void 0, function*() {
        return SessionFunctions.getJWTPayload(sessionHandle);
    });
}
exports.getJWTPayload = getJWTPayload;
/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function updateJWTPayload(sessionHandle, newJWTPayload) {
    return __awaiter(this, void 0, void 0, function*() {
        return SessionFunctions.updateJWTPayload(sessionHandle, newJWTPayload);
    });
}
exports.updateJWTPayload = updateJWTPayload;
/**
 * @class Session
 * @description an instance of this is created when a session is valid.
 */
class Session {
    constructor(accessToken, sessionHandle, userId, userDataInJWT, res) {
        /**
         * @description call this to logout the current user.
         * This only invalidates the refresh token. The access token can still be used after
         * @sideEffect may clear cookies from response.
         * @throw AuthError GENERAL_ERROR
         */
        this.revokeSession = () =>
            __awaiter(this, void 0, void 0, function*() {
                if (yield SessionFunctions.revokeSession(this.sessionHandle)) {
                    let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
                    cookieAndHeaders_1.clearSessionFromCookie(
                        this.res,
                        handShakeInfo.cookieDomain,
                        handShakeInfo.cookieSecure,
                        handShakeInfo.accessTokenPath,
                        handShakeInfo.refreshTokenPath,
                        handShakeInfo.idRefreshTokenPath,
                        handShakeInfo.cookieSameSite
                    );
                }
            });
        /**
         * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
         * @returns session data as provided by the user earlier
         * @sideEffect may clear cookies from response.
         * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
         */
        this.getSessionData = () =>
            __awaiter(this, void 0, void 0, function*() {
                try {
                    return yield SessionFunctions.getSessionData(this.sessionHandle);
                } catch (err) {
                    if (error_1.AuthError.isErrorFromAuth(err) && err.errType === error_1.AuthError.UNAUTHORISED) {
                        let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
                        cookieAndHeaders_1.clearSessionFromCookie(
                            this.res,
                            handShakeInfo.cookieDomain,
                            handShakeInfo.cookieSecure,
                            handShakeInfo.accessTokenPath,
                            handShakeInfo.refreshTokenPath,
                            handShakeInfo.idRefreshTokenPath,
                            handShakeInfo.cookieSameSite
                        );
                    }
                    throw err;
                }
            });
        /**
         * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
         * @sideEffect may clear cookies from response.
         * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
         */
        this.updateSessionData = newSessionData =>
            __awaiter(this, void 0, void 0, function*() {
                try {
                    yield SessionFunctions.updateSessionData(this.sessionHandle, newSessionData);
                } catch (err) {
                    if (error_1.AuthError.isErrorFromAuth(err) && err.errType === error_1.AuthError.UNAUTHORISED) {
                        let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
                        cookieAndHeaders_1.clearSessionFromCookie(
                            this.res,
                            handShakeInfo.cookieDomain,
                            handShakeInfo.cookieSecure,
                            handShakeInfo.accessTokenPath,
                            handShakeInfo.refreshTokenPath,
                            handShakeInfo.idRefreshTokenPath,
                            handShakeInfo.cookieSameSite
                        );
                    }
                    throw err;
                }
            });
        this.getUserId = () => {
            return this.userId;
        };
        this.getJWTPayload = () => {
            return this.userDataInJWT;
        };
        this.getHandle = () => {
            return this.sessionHandle;
        };
        this.getAccessToken = () => {
            return this.accessToken;
        };
        this.updateJWTPayload = newJWTPayload =>
            __awaiter(this, void 0, void 0, function*() {
                if ((yield querier_1.Querier.getInstance().getAPIVersion()) === "1.0") {
                    throw error_1.generateError(
                        error_1.AuthError.GENERAL_ERROR,
                        new Error("the current function is not supported for the core")
                    );
                }
                let response = yield querier_1.Querier.getInstance().sendPostRequest("/session/regenerate", {
                    accessToken: this.accessToken,
                    userDataInJWT: newJWTPayload
                });
                if (response.status === "UNAUTHORISED") {
                    let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
                    cookieAndHeaders_1.clearSessionFromCookie(
                        this.res,
                        handShakeInfo.cookieDomain,
                        handShakeInfo.cookieSecure,
                        handShakeInfo.accessTokenPath,
                        handShakeInfo.refreshTokenPath,
                        handShakeInfo.idRefreshTokenPath,
                        handShakeInfo.cookieSameSite
                    );
                    throw error_1.generateError(error_1.AuthError.UNAUTHORISED, new Error(response.message));
                }
                this.userDataInJWT = response.session.userDataInJWT;
                if (response.accessToken !== undefined) {
                    this.accessToken = response.accessToken;
                    cookieAndHeaders_1.attachAccessTokenToCookie(
                        this.res,
                        response.accessToken.token,
                        response.accessToken.expiry,
                        response.accessToken.domain,
                        response.accessToken.cookiePath,
                        response.accessToken.cookieSecure,
                        response.accessToken.sameSite
                    );
                }
            });
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInJWT = userDataInJWT;
        this.res = res;
        this.accessToken = accessToken;
    }
}
exports.Session = Session;
//# sourceMappingURL=express.js.map
