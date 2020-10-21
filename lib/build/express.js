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
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const error_1 = require("./error");
const SessionFunctions = require("./session");
const querier_1 = require("./querier");
const axios_1 = require("axios");
const qs = require("querystring");
const jwt = require("jsonwebtoken");
const middleware_1 = require("./middleware");
const utils_1 = require("./utils");
// TODO: Make it also work with PassportJS
/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * @param config
 */
function init(config) {
    SessionFunctions.init(config);
    return middleware_1.autoRefreshMiddleware();
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
        let response = yield SessionFunctions.createNewSession(userId, jwtPayload, sessionData);
        utils_1.attachCreateOrRefreshSessionResponseToExpressRes(res, response);
        return new Session(
            response.accessToken.token,
            response.session.handle,
            response.session.userId,
            response.session.userDataInJWT,
            response.accessToken.expiry,
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
    return __awaiter(this, void 0, void 0, function* () {
        cookieAndHeaders_1.saveFrontendInfoFromRequest(req);
        let idRefreshToken = cookieAndHeaders_1.getIdRefreshTokenFromCookie(req);
        if (idRefreshToken === undefined) {
            // we do not clear cookies here because of a
            // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
            throw error_1.generateError(error_1.AuthError.UNAUTHORISED, new Error("idRefreshToken missing"));
        }
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
            let response = yield SessionFunctions.getSession(accessToken, antiCsrfToken, doAntiCsrfCheck);
            if (response.accessToken !== undefined) {
                cookieAndHeaders_1.setFrontTokenInHeaders(
                    res,
                    response.session.userId,
                    response.accessToken.expiry,
                    response.session.userDataInJWT
                );
                cookieAndHeaders_1.attachAccessTokenToCookie(
                    res,
                    response.accessToken.token,
                    response.accessToken.expiry
                );
                accessToken = response.accessToken.token;
            }
            return new Session(
                accessToken,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                response.accessToken !== undefined ? response.accessToken.expiry : undefined,
                res
            );
        } catch (err) {
            if (error_1.AuthError.isErrorFromAuth(err) && err.errType === error_1.AuthError.UNAUTHORISED) {
                cookieAndHeaders_1.clearSessionFromCookie(res);
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
    return __awaiter(this, void 0, void 0, function* () {
        cookieAndHeaders_1.saveFrontendInfoFromRequest(req);
        let inputRefreshToken = cookieAndHeaders_1.getRefreshTokenFromCookie(req);
        if (inputRefreshToken === undefined) {
            // we do not clear cookies here because of a
            // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
            throw error_1.generateError(
                error_1.AuthError.UNAUTHORISED,
                new Error(
                    "Missing auth tokens in cookies. Have you set the correct refresh API path in your frontend and SuperTokens config?"
                )
            );
        }
        try {
            let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
            let response = yield SessionFunctions.refreshSession(inputRefreshToken, antiCsrfToken);
            utils_1.attachCreateOrRefreshSessionResponseToExpressRes(res, response);
            return new Session(
                response.accessToken.token,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                response.accessToken.expiry,
                res
            );
        } catch (err) {
            if (
                error_1.AuthError.isErrorFromAuth(err) &&
                (err.errType === error_1.AuthError.UNAUTHORISED ||
                    err.errType === error_1.AuthError.TOKEN_THEFT_DETECTED)
            ) {
                cookieAndHeaders_1.clearSessionFromCookie(res);
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
    return __awaiter(this, void 0, void 0, function* () {
        return SessionFunctions.revokeAllSessionsForUser(userId);
    });
}
exports.revokeAllSessionsForUser = revokeAllSessionsForUser;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
function getAllSessionHandlesForUser(userId) {
    return __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
        return SessionFunctions.getSessionData(sessionHandle);
    });
}
exports.getSessionData = getSessionData;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well. If you have a Session object, please use that instead.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function updateSessionData(sessionHandle, newSessionData) {
    return __awaiter(this, void 0, void 0, function* () {
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
        return SessionFunctions.getJWTPayload(sessionHandle);
    });
}
exports.getJWTPayload = getJWTPayload;
/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
function updateJWTPayload(sessionHandle, newJWTPayload) {
    return __awaiter(this, void 0, void 0, function* () {
        return SessionFunctions.updateJWTPayload(sessionHandle, newJWTPayload);
    });
}
exports.updateJWTPayload = updateJWTPayload;
function auth0Handler(request, response, next, domain, clientId, clientSecret, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let requestBody = request.body;
            if (requestBody.action === "logout") {
                if (request.session === undefined) {
                    request.session = yield getSession(request, response, true);
                }
                yield request.session.revokeSession();
                return response.json({});
            }
            let authCode = requestBody.code;
            let redirectURI = requestBody.redirect_uri;
            if (requestBody.action !== "login") {
                request.session = yield getSession(request, response, true);
            }
            let formData = {};
            if (authCode === undefined && requestBody.action === "refresh") {
                let sessionData = yield request.session.getSessionData();
                if (sessionData.refresh_token === undefined) {
                    response.statusCode = 403;
                    return response.json({});
                }
                formData = {
                    grant_type: "refresh_token",
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: sessionData.refresh_token,
                };
            } else {
                formData = {
                    grant_type: "authorization_code",
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: authCode,
                    redirect_uri: redirectURI,
                };
            }
            let auth0Response;
            try {
                auth0Response = yield axios_1.default({
                    method: "post",
                    url: `https://${domain}/oauth/token`,
                    data: qs.stringify(formData),
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                });
            } catch (err) {
                if (err.response !== undefined && err.response.status < 500) {
                    response.statusCode = err.response.status;
                    return response.json({});
                }
                throw err;
            }
            let idToken = auth0Response.data.id_token;
            let expiresIn = auth0Response.data.expires_in;
            let accessToken = auth0Response.data.access_token;
            let refreshToken = auth0Response.data.refresh_token;
            if (requestBody.action === "login") {
                let payload = jwt.decode(idToken, { json: true });
                if (payload === null) {
                    throw Error("invalid payload while decoding auth0 idToken");
                }
                if (callback !== undefined) {
                    yield callback(payload.sub, idToken, accessToken, refreshToken);
                } else {
                    yield createNewSession(
                        response,
                        payload.sub,
                        {},
                        {
                            refresh_token: refreshToken,
                        }
                    );
                }
            } else if (authCode !== undefined) {
                let sessionData = yield request.session.getSessionData();
                sessionData.refresh_token = refreshToken;
                yield request.session.updateSessionData(sessionData);
            }
            return response.json({
                id_token: idToken,
                expires_in: expiresIn,
            });
        } catch (err) {
            next(error_1.generateError(error_1.AuthError.GENERAL_ERROR, err));
        }
    });
}
exports.auth0Handler = auth0Handler;
/**
 * @class Session
 * @description an instance of this is created when a session is valid.
 */
class Session {
    constructor(accessToken, sessionHandle, userId, userDataInJWT, accessTokenExpiry, res) {
        // TODO: remove when handshakeInfo has accessToken lifetime param
        this.getAccessTokenExpiry = () => {
            return this.accessTokenExpiry;
        };
        /**
         * @description call this to logout the current user.
         * This only invalidates the refresh token. The access token can still be used after
         * @sideEffect may clear cookies from response.
         * @throw AuthError GENERAL_ERROR
         */
        this.revokeSession = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (yield SessionFunctions.revokeSession(this.sessionHandle)) {
                    cookieAndHeaders_1.clearSessionFromCookie(this.res);
                }
            });
        /**
         * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
         * @returns session data as provided by the user earlier
         * @sideEffect may clear cookies from response.
         * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
         */
        this.getSessionData = () =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield SessionFunctions.getSessionData(this.sessionHandle);
                } catch (err) {
                    if (error_1.AuthError.isErrorFromAuth(err) && err.errType === error_1.AuthError.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.res);
                    }
                    throw err;
                }
            });
        /**
         * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
         * @sideEffect may clear cookies from response.
         * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
         */
        this.updateSessionData = (newSessionData) =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    yield SessionFunctions.updateSessionData(this.sessionHandle, newSessionData);
                } catch (err) {
                    if (error_1.AuthError.isErrorFromAuth(err) && err.errType === error_1.AuthError.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this.res);
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
        this.updateJWTPayload = (newJWTPayload) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield querier_1.Querier.getInstanceOrThrowError().sendPostRequest(
                    "/session/regenerate",
                    {
                        accessToken: this.accessToken,
                        userDataInJWT: newJWTPayload,
                    }
                );
                if (response.status === "UNAUTHORISED") {
                    cookieAndHeaders_1.clearSessionFromCookie(this.res);
                    throw error_1.generateError(error_1.AuthError.UNAUTHORISED, new Error(response.message));
                }
                this.userDataInJWT = response.session.userDataInJWT;
                if (response.accessToken !== undefined) {
                    this.accessToken = response.accessToken.token;
                    cookieAndHeaders_1.setFrontTokenInHeaders(
                        this.res,
                        response.session.userId,
                        response.accessToken.expiry,
                        response.session.userDataInJWT
                    );
                    cookieAndHeaders_1.attachAccessTokenToCookie(
                        this.res,
                        response.accessToken.token,
                        response.accessToken.expiry
                    );
                }
            });
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInJWT = userDataInJWT;
        this.res = res;
        this.accessToken = accessToken;
        this.accessTokenExpiry = accessTokenExpiry;
    }
}
exports.Session = Session;
//# sourceMappingURL=express.js.map
