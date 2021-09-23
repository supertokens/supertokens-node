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
const utils_1 = require("./utils");
const refresh_1 = require("./api/refresh");
const signout_1 = require("./api/signout");
const constants_1 = require("./constants");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const recipeImplementation_1 = require("./recipeImplementation");
const querier_1 = require("../../querier");
const implementation_1 = require("./api/implementation");
// For Express
class SessionRecipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.REFRESH_API_PATH),
                    id: constants_1.REFRESH_API_PATH,
                    disabled: this.apiImpl.refreshPOST === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGNOUT_API_PATH),
                    id: constants_1.SIGNOUT_API_PATH,
                    disabled: this.apiImpl.signOutPOST === undefined,
                },
            ];
        };
        this.handleAPIRequest = (id, req, res, __, ___) =>
            __awaiter(this, void 0, void 0, function* () {
                let options = {
                    config: this.config,
                    recipeId: this.getRecipeId(),
                    isInServerlessEnv: this.isInServerlessEnv,
                    recipeImplementation: this.recipeInterfaceImpl,
                    req,
                    res,
                };
                if (id === constants_1.REFRESH_API_PATH) {
                    return yield refresh_1.default(this.apiImpl, options);
                } else {
                    return yield signout_1.default(this.apiImpl, options);
                }
            });
        this.handleError = (err, request, response) =>
            __awaiter(this, void 0, void 0, function* () {
                if (err.fromRecipe === SessionRecipe.RECIPE_ID) {
                    if (err.type === error_1.default.UNAUTHORISED) {
                        return yield this.config.errorHandlers.onUnauthorised(err.message, request, response);
                    } else if (err.type === error_1.default.TRY_REFRESH_TOKEN) {
                        return yield this.config.errorHandlers.onTryRefreshToken(err.message, request, response);
                    } else if (err.type === error_1.default.TOKEN_THEFT_DETECTED) {
                        return yield this.config.errorHandlers.onTokenTheftDetected(
                            err.payload.sessionHandle,
                            err.payload.userId,
                            request,
                            response
                        );
                    } else {
                        throw err;
                    }
                } else {
                    throw err;
                }
            });
        this.getAllCORSHeaders = () => {
            return cookieAndHeaders_1.getCORSAllowedHeaders();
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === SessionRecipe.RECIPE_ID;
        };
        this.verifySession = (options, request, response) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.apiImpl.verifySession({
                    verifySessionOptions: options,
                    options: {
                        config: this.config,
                        req: request,
                        res: response,
                        recipeId: this.getRecipeId(),
                        isInServerlessEnv: this.isInServerlessEnv,
                        recipeImplementation: this.recipeInterfaceImpl,
                    },
                });
            });
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        this.recipeInterfaceImpl = this.config.override.functions(
            new recipeImplementation_1.default(
                querier_1.Querier.getNewInstanceOrThrowError(recipeId),
                this.config,
                isInServerlessEnv
            )
        );
        this.apiImpl = this.config.override.apis(new implementation_1.default());
    }
    static getInstanceOrThrowError() {
        if (SessionRecipe.instance !== undefined) {
            return SessionRecipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (SessionRecipe.instance === undefined) {
                SessionRecipe.instance = new SessionRecipe(SessionRecipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return SessionRecipe.instance;
            } else {
                throw new Error("Session recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        SessionRecipe.instance = undefined;
    }
}
exports.default = SessionRecipe;
SessionRecipe.instance = undefined;
SessionRecipe.RECIPE_ID = "session";
