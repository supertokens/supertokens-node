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
const recipeModule_1 = require("../../recipeModule");
const jwt = require("jsonwebtoken");
const error_1 = require("./error");
const sessionClass_1 = require("./sessionClass");
const utils_1 = require("./utils");
const SessionFunctions = require("./sessionFunctions");
const qs = require("querystring");
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const axios_1 = require("axios");
// For Express
class SessionRecipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config) {
        super(recipeId, appInfo);
        this.handshakeInfo = undefined;
        // instance functions below...............
        this.getHandshakeInfo = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.handshakeInfo == undefined) {
                    let response = yield this.getQuerier().sendPostRequest("/handshake", {});
                    this.handshakeInfo = {
                        jwtSigningPublicKey: response.jwtSigningPublicKey,
                        enableAntiCsrf: response.enableAntiCsrf,
                        accessTokenBlacklistingEnabled: response.accessTokenBlacklistingEnabled,
                        jwtSigningPublicKeyExpiryTime: response.jwtSigningPublicKeyExpiryTime,
                        accessTokenVaildity: response.accessTokenVaildity,
                        refreshTokenVaildity: response.refreshTokenVaildity,
                    };
                }
                return this.handshakeInfo;
            });
        this.updateJwtSigningPublicKeyInfo = (newKey, newExpiry) => {
            if (this.handshakeInfo !== undefined) {
                this.handshakeInfo.jwtSigningPublicKey = newKey;
                this.handshakeInfo.jwtSigningPublicKeyExpiryTime = newExpiry;
            }
        };
        this.createNewSession = (res, userId, jwtPayload = {}, sessionData = {}) =>
            __awaiter(this, void 0, void 0, function* () {
                let response = yield SessionFunctions.createNewSession(this, userId, jwtPayload, sessionData);
                utils_1.attachCreateOrRefreshSessionResponseToExpressRes(this, res, response);
                return new sessionClass_1.default(
                    this,
                    response.accessToken.token,
                    response.session.handle,
                    response.session.userId,
                    response.session.userDataInJWT,
                    response.accessToken.expiry,
                    res
                );
            });
        this.getSession = (req, res, doAntiCsrfCheck) =>
            __awaiter(this, void 0, void 0, function* () {
                let idRefreshToken = cookieAndHeaders_1.getIdRefreshTokenFromCookie(req);
                if (idRefreshToken === undefined) {
                    // we do not clear cookies here because of a
                    // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                    throw new error_1.default(
                        {
                            message:
                                "Session does not exist. Are you sending the session tokens in the request as cookies?",
                            type: error_1.default.UNAUTHORISED,
                        },
                        this.getRecipeId()
                    );
                }
                let accessToken = cookieAndHeaders_1.getAccessTokenFromCookie(req);
                if (accessToken === undefined) {
                    // maybe the access token has expired.
                    throw new error_1.default(
                        {
                            message: "Access token has expired. Please call the refresh API",
                            type: error_1.default.TRY_REFRESH_TOKEN,
                        },
                        this.getRecipeId()
                    );
                }
                try {
                    let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                    let response = yield SessionFunctions.getSession(this, accessToken, antiCsrfToken, doAntiCsrfCheck);
                    if (response.accessToken !== undefined) {
                        cookieAndHeaders_1.setFrontTokenInHeaders(
                            this,
                            res,
                            response.session.userId,
                            response.accessToken.expiry,
                            response.session.userDataInJWT
                        );
                        cookieAndHeaders_1.attachAccessTokenToCookie(
                            this,
                            res,
                            response.accessToken.token,
                            response.accessToken.expiry
                        );
                        accessToken = response.accessToken.token;
                    }
                    return new sessionClass_1.default(
                        this,
                        accessToken,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
                        response.accessToken !== undefined ? response.accessToken.expiry : undefined,
                        res
                    );
                } catch (err) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        cookieAndHeaders_1.clearSessionFromCookie(this, res);
                    }
                    throw err;
                }
            });
        this.refreshSession = (req, res) =>
            __awaiter(this, void 0, void 0, function* () {
                let inputRefreshToken = cookieAndHeaders_1.getRefreshTokenFromCookie(req);
                if (inputRefreshToken === undefined) {
                    // we do not clear cookies here because of a
                    // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                    throw new error_1.default(
                        {
                            message:
                                "Refresh token not found. Are you sending the refresh token in the request as a cookie?",
                            type: error_1.default.UNAUTHORISED,
                        },
                        this.getRecipeId()
                    );
                }
                try {
                    let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                    let response = yield SessionFunctions.refreshSession(this, inputRefreshToken, antiCsrfToken);
                    utils_1.attachCreateOrRefreshSessionResponseToExpressRes(this, res, response);
                    return new sessionClass_1.default(
                        this,
                        response.accessToken.token,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
                        response.accessToken.expiry,
                        res
                    );
                } catch (err) {
                    if (
                        err.type === error_1.default.UNAUTHORISED ||
                        err.type === error_1.default.TOKEN_THEFT_DETECTED
                    ) {
                        cookieAndHeaders_1.clearSessionFromCookie(this, res);
                    }
                    throw err;
                }
            });
        this.revokeAllSessionsForUser = (userId) => {
            return SessionFunctions.revokeAllSessionsForUser(this, userId);
        };
        this.getAllSessionHandlesForUser = (userId) => {
            return SessionFunctions.getAllSessionHandlesForUser(this, userId);
        };
        this.revokeSession = (sessionHandle) => {
            return SessionFunctions.revokeSession(this, sessionHandle);
        };
        this.revokeMultipleSessions = (sessionHandles) => {
            return SessionFunctions.revokeMultipleSessions(this, sessionHandles);
        };
        this.getSessionData = (sessionHandle) => {
            return SessionFunctions.getSessionData(this, sessionHandle);
        };
        this.updateSessionData = (sessionHandle, newSessionData) => {
            return SessionFunctions.updateSessionData(this, sessionHandle, newSessionData);
        };
        this.getCORSAllowedHeaders = () => {
            return cookieAndHeaders_1.getCORSAllowedHeaders();
        };
        this.getJWTPayload = (sessionHandle) => {
            return SessionFunctions.getJWTPayload(this, sessionHandle);
        };
        this.updateJWTPayload = (sessionHandle, newJWTPayload) => {
            return SessionFunctions.updateJWTPayload(this, sessionHandle, newJWTPayload);
        };
        this.auth0Handler = (request, response, next, domain, clientId, clientSecret, callback) =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    let requestBody = request.body;
                    if (requestBody.action === "logout") {
                        if (request.session === undefined) {
                            request.session = yield this.getSession(request, response, true);
                        }
                        yield request.session.revokeSession();
                        return response.json({});
                    }
                    let authCode = requestBody.code;
                    let redirectURI = requestBody.redirect_uri;
                    if (requestBody.action !== "login") {
                        request.session = yield this.getSession(request, response, true);
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
                            yield this.createNewSession(
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
                    next(
                        new error_1.default(
                            {
                                type: error_1.default.GENERAL_ERROR,
                                payload: err,
                            },
                            this.getRecipeId()
                        )
                    );
                }
            });
        try {
            let normalisedInput = utils_1.validateAndNormaliseUserInput(config);
            this.config = {
                accessTokenPath: normalisedInput.accessTokenPath,
                refreshTokenPath: appInfo.apiBasePath + "/session/refresh",
                cookieDomain: normalisedInput.cookieDomain,
                cookieSecure: normalisedInput.cookieSecure,
                cookieSameSite: normalisedInput.cookieSameSite,
                sessionExpiredStatusCode: normalisedInput.sessionExpiredStatusCode,
            };
            // Solving the cold start problem
            this.getHandshakeInfo().catch((ignored) => {
                // ignored
            });
        } catch (err) {
            throw new error_1.default(
                {
                    type: error_1.default.GENERAL_ERROR,
                    payload: err,
                },
                recipeId
            );
        }
    }
    static getInstanceOrThrowError() {
        if (SessionRecipe.instance !== undefined) {
            return SessionRecipe.instance;
        }
        throw new error_1.default(
            {
                type: error_1.default.GENERAL_ERROR,
                payload: new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?"),
            },
            SessionRecipe.RECIPE_ID
        );
    }
    static init(config) {
        return (appInfo) => {
            if (SessionRecipe.instance === undefined) {
                SessionRecipe.instance = new SessionRecipe("session", appInfo, config);
                return SessionRecipe.instance;
            } else {
                throw new error_1.default(
                    {
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error(
                            "Session recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    SessionRecipe.RECIPE_ID
                );
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new error_1.default(
                {
                    type: error_1.default.GENERAL_ERROR,
                    payload: new Error("calling testing function in non testing env"),
                },
                SessionRecipe.RECIPE_ID
            );
        }
        SessionRecipe.instance = undefined;
    }
}
exports.default = SessionRecipe;
SessionRecipe.instance = undefined;
SessionRecipe.RECIPE_ID = "session";
//# sourceMappingURL=sessionRecipe.js.map
