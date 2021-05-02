"use strict";
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
const error_1 = require("./error");
const sessionClass_1 = require("./sessionClass");
const utils_1 = require("./utils");
const SessionFunctions = require("./sessionFunctions");
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const refresh_1 = require("./api/refresh");
const signout_1 = require("./api/signout");
const constants_1 = require("./constants");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const utils_2 = require("../../utils");
const processState_1 = require("../../processState");
// For Express
class SessionRecipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo, isInServerlessEnv);
        this.handshakeInfo = undefined;
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(this, constants_1.REFRESH_API_PATH),
                    id: constants_1.REFRESH_API_PATH,
                    disabled: this.config.sessionRefreshFeature.disableDefaultImplementation,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(this, constants_1.SIGNOUT_API_PATH),
                    id: constants_1.SIGNOUT_API_PATH,
                    disabled: this.config.signOutFeature.disableDefaultImplementation,
                },
            ];
        };
        this.handleAPIRequest = (id, req, res, next, __, ___) =>
            __awaiter(this, void 0, void 0, function* () {
                if (id === constants_1.REFRESH_API_PATH) {
                    return yield refresh_1.default(this, req, res, next);
                } else {
                    return yield signout_1.default(this, req, res, next);
                }
            });
        this.handleError = (err, request, response, next) => {
            if (err.type === error_1.default.UNAUTHORISED) {
                return this.config.errorHandlers.onUnauthorised(err.message, request, response, next);
            } else if (err.type === error_1.default.TRY_REFRESH_TOKEN) {
                return this.config.errorHandlers.onTryRefreshToken(err.message, request, response, next);
            } else if (err.type === error_1.default.TOKEN_THEFT_DETECTED) {
                return this.config.errorHandlers.onTokenTheftDetected(
                    err.payload.sessionHandle,
                    err.payload.userId,
                    request,
                    response,
                    next
                );
            } else {
                return next(err);
            }
        };
        this.getAllCORSHeaders = () => {
            return cookieAndHeaders_1.getCORSAllowedHeaders();
        };
        this.isErrorFromThisOrChildRecipeBasedOnInstance = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && this === err.recipe;
        };
        // instance functions below...............
        this.getHandshakeInfo = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.handshakeInfo === undefined) {
                    let antiCsrf = this.config.antiCsrf;
                    if (this.checkIfInServerlessEnv()) {
                        let handshakeInfo = yield utils_2.getDataFromFileForServerlessCache(
                            constants_1.SERVERLESS_CACHE_HANDSHAKE_INFO_FILE_PATH
                        );
                        if (handshakeInfo !== undefined) {
                            handshakeInfo = Object.assign(Object.assign({}, handshakeInfo), { antiCsrf });
                            this.handshakeInfo = handshakeInfo;
                            return this.handshakeInfo;
                        }
                    }
                    processState_1.ProcessState.getInstance().addState(
                        processState_1.PROCESS_STATE.CALLING_SERVICE_IN_GET_HANDSHAKE_INFO
                    );
                    let response = yield this.getQuerier().sendPostRequest(
                        new normalisedURLPath_1.default(this, "/recipe/handshake"),
                        {}
                    );
                    this.handshakeInfo = {
                        jwtSigningPublicKey: response.jwtSigningPublicKey,
                        antiCsrf,
                        accessTokenBlacklistingEnabled: response.accessTokenBlacklistingEnabled,
                        jwtSigningPublicKeyExpiryTime: response.jwtSigningPublicKeyExpiryTime,
                        accessTokenValidity: response.accessTokenValidity,
                        refreshTokenValidity: response.refreshTokenValidity,
                    };
                    if (this.checkIfInServerlessEnv()) {
                        utils_2.storeIntoTempFolderForServerlessCache(
                            constants_1.SERVERLESS_CACHE_HANDSHAKE_INFO_FILE_PATH,
                            this.handshakeInfo
                        );
                    }
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
                    res
                );
            });
        this.getSession = (req, res, options) =>
            __awaiter(this, void 0, void 0, function* () {
                let doAntiCsrfCheck =
                    options !== undefined
                        ? typeof options === "boolean"
                            ? options
                            : options.antiCsrfCheck
                        : undefined;
                let idRefreshToken = cookieAndHeaders_1.getIdRefreshTokenFromCookie(req);
                if (idRefreshToken === undefined) {
                    // we do not clear cookies here because of a
                    // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                    if (options !== undefined && typeof options !== "boolean" && options.sessionRequired === false) {
                        // there is no session that exists here, and the user wants session verification
                        // to be optional. So we return undefined.
                        return undefined;
                    }
                    throw new error_1.default(
                        {
                            message:
                                "Session does not exist. Are you sending the session tokens in the request as cookies?",
                            type: error_1.default.UNAUTHORISED,
                        },
                        this
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
                        this
                    );
                }
                try {
                    let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                    if (doAntiCsrfCheck === undefined) {
                        doAntiCsrfCheck = utils_2.normaliseHttpMethod(req.method) !== "get";
                    }
                    let response = yield SessionFunctions.getSession(
                        this,
                        accessToken,
                        antiCsrfToken,
                        doAntiCsrfCheck,
                        cookieAndHeaders_1.getRidFromHeader(req) !== undefined
                    );
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
                let inputIdRefreshToken = cookieAndHeaders_1.getIdRefreshTokenFromCookie(req);
                if (inputIdRefreshToken === undefined) {
                    // we do not clear cookies here because of a
                    // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                    throw new error_1.default(
                        {
                            message:
                                "Session does not exist. Are you sending the session tokens in the request as cookies?",
                            type: error_1.default.UNAUTHORISED,
                        },
                        this
                    );
                }
                try {
                    let inputRefreshToken = cookieAndHeaders_1.getRefreshTokenFromCookie(req);
                    if (inputRefreshToken === undefined) {
                        throw new error_1.default(
                            {
                                message:
                                    "Refresh token not found. Are you sending the refresh token in the request as a cookie?",
                                type: error_1.default.UNAUTHORISED,
                            },
                            this
                        );
                    }
                    let antiCsrfToken = cookieAndHeaders_1.getAntiCsrfTokenFromHeaders(req);
                    let response = yield SessionFunctions.refreshSession(
                        this,
                        inputRefreshToken,
                        antiCsrfToken,
                        cookieAndHeaders_1.getRidFromHeader(req) !== undefined
                    );
                    utils_1.attachCreateOrRefreshSessionResponseToExpressRes(this, res, response);
                    return new sessionClass_1.default(
                        this,
                        response.accessToken.token,
                        response.session.handle,
                        response.session.userId,
                        response.session.userDataInJWT,
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
        this.getJWTPayload = (sessionHandle) => {
            return SessionFunctions.getJWTPayload(this, sessionHandle);
        };
        this.updateJWTPayload = (sessionHandle, newJWTPayload) => {
            return SessionFunctions.updateJWTPayload(this, sessionHandle, newJWTPayload);
        };
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        // Solving the cold start problem
        this.getHandshakeInfo().catch((_) => {
            // ignored
        });
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
            undefined
        );
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (SessionRecipe.instance === undefined) {
                SessionRecipe.instance = new SessionRecipe(SessionRecipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return SessionRecipe.instance;
            } else {
                throw new error_1.default(
                    {
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error(
                            "Session recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    undefined
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
                undefined
            );
        }
        SessionRecipe.instance = undefined;
    }
}
exports.default = SessionRecipe;
SessionRecipe.instance = undefined;
SessionRecipe.RECIPE_ID = "session";
//# sourceMappingURL=sessionRecipe.js.map
