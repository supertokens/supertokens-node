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
const sessionRecipe_1 = require("../sessionRecipe");
const error_1 = require("../error");
const faunadb = require("faunadb");
const sessionClass_1 = require("./sessionClass");
const recipeModule_1 = require("../../../recipeModule");
const constants_1 = require("./constants");
// For Express
class SessionRecipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config) {
        super(recipeId, appInfo);
        this.q = faunadb.query;
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return this.parentRecipe.getAPIsHandled();
        };
        this.handleAPIRequest = (id, req, res, next) => {
            return this.parentRecipe.handleAPIRequest(id, req, res, next);
        };
        this.handleError = (err, request, response, next) => {
            return this.parentRecipe.handleError(err, request, response, next);
        };
        this.getAllCORSHeaders = () => {
            return this.parentRecipe.getAllCORSHeaders();
        };
        this.isErrorFromThisOrChildRecipeBasedOnInstance = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && this === err.recipe;
        };
        // instance functions.........
        this.getFDAT = (session) =>
            __awaiter(this, void 0, void 0, function* () {
                function getFaunadbTokenTimeLag() {
                    if (process.env.INSTALL_PATH !== undefined) {
                        // if in testing...
                        return 2 * 1000;
                    }
                    return constants_1.FAUNADB_TOKEN_TIME_LAG_MILLI;
                }
                let accessTokenLifetime = (yield this.parentRecipe.getHandshakeInfo()).accessTokenValidity;
                let faunaResponse = yield this.faunaDBClient.query(
                    this.q.Create(this.q.Tokens(), {
                        instance: this.q.Ref(this.q.Collection(this.config.userCollectionName), session.getUserId()),
                        ttl: this.q.TimeAdd(
                            this.q.Now(),
                            accessTokenLifetime + getFaunadbTokenTimeLag(),
                            "millisecond"
                        ),
                    })
                );
                return faunaResponse.secret;
            });
        this.createNewSession = (res, userId, jwtPayload = {}, sessionData = {}) =>
            __awaiter(this, void 0, void 0, function* () {
                // TODO: HandshakeInfo should give the access token lifetime so that we do not have to do a double query
                let originalSession = yield this.superCreateNewSession(res, userId, jwtPayload, sessionData);
                let session = new sessionClass_1.default(
                    this.parentRecipe,
                    originalSession.getAccessToken(),
                    originalSession.getHandle(),
                    originalSession.getUserId(),
                    originalSession.getJWTPayload(),
                    res
                );
                try {
                    let fdat = yield this.getFDAT(session);
                    if (this.config.accessFaunadbTokenFromFrontend) {
                        let newPayload = Object.assign({}, jwtPayload);
                        newPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateJWTPayload(newPayload);
                    } else {
                        let newPayload = Object.assign({}, sessionData);
                        newPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateSessionData(newPayload);
                    }
                    return session;
                } catch (err) {
                    throw new error_1.default(
                        {
                            type: error_1.default.GENERAL_ERROR,
                            payload: err,
                        },
                        this
                    );
                }
            });
        this.getSession = (req, res, doAntiCsrfCheck) =>
            __awaiter(this, void 0, void 0, function* () {
                let originalSession = yield this.superGetSession(req, res, doAntiCsrfCheck);
                return new sessionClass_1.default(
                    this.parentRecipe,
                    originalSession.getAccessToken(),
                    originalSession.getHandle(),
                    originalSession.getUserId(),
                    originalSession.getJWTPayload(),
                    res
                );
            });
        this.refreshSession = (req, res) =>
            __awaiter(this, void 0, void 0, function* () {
                let originalSession = yield this.superRefreshSession(req, res);
                let session = new sessionClass_1.default(
                    this.parentRecipe,
                    originalSession.getAccessToken(),
                    originalSession.getHandle(),
                    originalSession.getUserId(),
                    originalSession.getJWTPayload(),
                    res
                );
                try {
                    let fdat = yield this.getFDAT(session);
                    // we do not use the accessFaunaDBTokenFromFrontend boolean here so that
                    // it can be changed without affecting existing sessions.
                    if (session.getJWTPayload()[constants_1.FAUNADB_SESSION_KEY] !== undefined) {
                        let newPayload = Object.assign({}, session.getJWTPayload());
                        newPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateJWTPayload(newPayload);
                    } else {
                        let newPayload = Object.assign({}, yield session.getSessionData());
                        newPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateSessionData(newPayload);
                    }
                    return session;
                } catch (err) {
                    throw new error_1.default(
                        {
                            type: error_1.default.GENERAL_ERROR,
                            payload: err,
                        },
                        this
                    );
                }
            });
        this.parentRecipe = new sessionRecipe_1.default(recipeId, appInfo, config);
        // we save the parent recipe's functions here, so that they can be used later
        this.superCreateNewSession = this.parentRecipe.createNewSession;
        this.superGetSession = this.parentRecipe.getSession;
        this.superRefreshSession = this.parentRecipe.refreshSession;
        // we override the parent recipe's functions with the modified ones.
        this.parentRecipe.createNewSession = this.createNewSession;
        this.parentRecipe.getSession = this.getSession;
        this.parentRecipe.refreshSession = this.refreshSession;
        this.config = {
            accessFaunadbTokenFromFrontend:
                config.accessFaunadbTokenFromFrontend === undefined ? false : config.accessFaunadbTokenFromFrontend,
            userCollectionName: config.userCollectionName,
        };
        if ("faunadbSecret" in config) {
            try {
                this.faunaDBClient = new faunadb.Client({
                    secret: config.faunadbSecret,
                });
            } catch (err) {
                throw new error_1.default(
                    {
                        payload: err,
                        type: error_1.default.GENERAL_ERROR,
                    },
                    this
                );
            }
        } else {
            this.faunaDBClient = config.faunadbClient;
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
            undefined
        );
    }
    static init(config) {
        return (appInfo) => {
            if (SessionRecipe.instance === undefined) {
                SessionRecipe.instance = new SessionRecipe(sessionRecipe_1.default.RECIPE_ID, appInfo, config);
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
//# sourceMappingURL=sessionRecipe.js.map
