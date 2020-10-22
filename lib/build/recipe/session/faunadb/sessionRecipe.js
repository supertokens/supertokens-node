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
const sessionRecipe_1 = require("../sessionRecipe");
const error_1 = require("../error");
const faunadb = require("faunadb");
const sessionClass_1 = require("./sessionClass");
exports.FAUNADB_TOKEN_TIME_LAG_MILLI = 30 * 1000;
exports.FAUNADB_SESSION_KEY = "faunadbToken";
const q = faunadb.query;
let faunaDBClient;
// For Express
class SessionRecipe extends sessionRecipe_1.default {
    constructor(recipeId, appInfo, config) {
        super(recipeId, appInfo, config);
        // instance functions.........
        this.getFDAT = (session) =>
            __awaiter(this, void 0, void 0, function* () {
                function getFaunadbTokenTimeLag() {
                    if (process.env.INSTALL_PATH !== undefined) {
                        // if in testing...
                        return 2 * 1000;
                    }
                    return exports.FAUNADB_TOKEN_TIME_LAG_MILLI;
                }
                let accessTokenExpiry = session.getAccessTokenExpiry();
                if (accessTokenExpiry === undefined) {
                    throw new Error("Should not come here");
                }
                let accessTokenLifetime = accessTokenExpiry - Date.now();
                let faunaResponse = yield faunaDBClient.query(
                    q.Create(q.Tokens(), {
                        instance: q.Ref(q.Collection(this.faunaConfig.userCollectionName), session.getUserId()),
                        ttl: q.TimeAdd(q.Now(), accessTokenLifetime + getFaunadbTokenTimeLag(), "millisecond"),
                    })
                );
                return faunaResponse.secret;
            });
        this.createNewSession = (res, userId, jwtPayload = {}, sessionData = {}) =>
            __awaiter(this, void 0, void 0, function* () {
                // TODO: HandshakeInfo should give the access token lifetime so that we do not have to do a double query
                let originalSession = yield super.createNewSession(res, userId, jwtPayload, sessionData);
                let session = new sessionClass_1.default(
                    this,
                    originalSession.getAccessToken(),
                    originalSession.getHandle(),
                    originalSession.getUserId(),
                    originalSession.getJWTPayload(),
                    originalSession.getAccessTokenExpiry(), // TODO: remove this field from session once handshake info has access token expiry
                    res
                );
                try {
                    let fdat = yield this.getFDAT(session);
                    if (this.faunaConfig.accessFaunadbTokenFromFrontend) {
                        let newPayload = Object.assign({}, jwtPayload);
                        newPayload[exports.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateJWTPayload(newPayload);
                    } else {
                        let newPayload = Object.assign({}, sessionData);
                        newPayload[exports.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateSessionData(newPayload);
                    }
                    return session;
                } catch (err) {
                    throw new error_1.default(
                        {
                            type: error_1.default.GENERAL_ERROR,
                            payload: err,
                        },
                        this.getRecipeId()
                    );
                }
            });
        this.getSession = (req, res, doAntiCsrfCheck) =>
            __awaiter(this, void 0, void 0, function* () {
                let originalSession = yield super.getSession(req, res, doAntiCsrfCheck);
                return new sessionClass_1.default(
                    this,
                    originalSession.getAccessToken(),
                    originalSession.getHandle(),
                    originalSession.getUserId(),
                    originalSession.getJWTPayload(),
                    originalSession.getAccessTokenExpiry(),
                    res
                );
            });
        this.refreshSession = (req, res) =>
            __awaiter(this, void 0, void 0, function* () {
                let originalSession = yield super.refreshSession(req, res);
                let session = new sessionClass_1.default(
                    this,
                    originalSession.getAccessToken(),
                    originalSession.getHandle(),
                    originalSession.getUserId(),
                    originalSession.getJWTPayload(),
                    originalSession.getAccessTokenExpiry(),
                    res
                );
                try {
                    let fdat = yield this.getFDAT(session);
                    // we do not use the accessFaunaDBTokenFromFrontend boolean here so that
                    // it can be changed without affecting existing sessions.
                    if (session.getJWTPayload()[exports.FAUNADB_SESSION_KEY] !== undefined) {
                        let newPayload = Object.assign({}, session.getJWTPayload());
                        newPayload[exports.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateJWTPayload(newPayload);
                    } else {
                        let newPayload = Object.assign({}, yield session.getSessionData());
                        newPayload[exports.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateSessionData(newPayload);
                    }
                    return session;
                } catch (err) {
                    throw new error_1.default(
                        {
                            type: error_1.default.GENERAL_ERROR,
                            payload: err,
                        },
                        this.getRecipeId()
                    );
                }
            });
        this.faunaConfig = {
            faunadbSecret: config.faunadbSecret,
            accessFaunadbTokenFromFrontend:
                config.accessFaunadbTokenFromFrontend === undefined ? false : config.accessFaunadbTokenFromFrontend,
            userCollectionName: config.userCollectionName,
        };
    }
    static getInstanceOrThrowError() {
        if (SessionRecipe.faunaSessionRecipeInstance !== undefined) {
            return SessionRecipe.faunaSessionRecipeInstance;
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
            if (SessionRecipe.faunaSessionRecipeInstance === undefined) {
                SessionRecipe.faunaSessionRecipeInstance = new SessionRecipe("session", appInfo, config);
                return SessionRecipe.faunaSessionRecipeInstance;
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
        SessionRecipe.faunaSessionRecipeInstance = undefined;
    }
}
exports.default = SessionRecipe;
SessionRecipe.faunaSessionRecipeInstance = undefined;
//# sourceMappingURL=sessionRecipe.js.map
