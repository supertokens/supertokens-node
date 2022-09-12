"use strict";
/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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
const supertokens_js_override_1 = require("supertokens-js-override");
const recipeModule_1 = require("../../recipeModule");
const recipeImplementation_1 = require("./recipeImplementation");
const implementation_1 = require("./api/implementation");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const dashboard_1 = require("./api/dashboard");
const error_1 = require("../../error");
const validateKey_1 = require("./api/validateKey");
const apiKeyProtector_1 = require("./api/apiKeyProtector");
const usersGet_1 = require("./api/usersGet");
const usersCountGet_1 = require("./api/usersCountGet");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            /**
             * Normally this array is used by the SDK to decide whether or not the recipe
             * handles a specific API path and method and then returns the ID.
             *
             * For the dashboard recipe this logic is fully custom and handled inside the
             * `returnAPIIdIfCanHandleRequest` method of this class. Since this array is never
             * used for this recipe, we simply return an empty array.
             */
            return [];
        };
        this.handleAPIRequest = (id, req, res, __, ___) =>
            __awaiter(this, void 0, void 0, function* () {
                let options = {
                    config: this.config,
                    recipeId: this.getRecipeId(),
                    recipeImplementation: this.recipeInterfaceImpl,
                    req,
                    res,
                    isInServerlessEnv: this.isInServerlessEnv,
                    appInfo: this.getAppInfo(),
                };
                // For these APIs we dont need API key validation
                if (id === constants_1.DASHBOARD_API) {
                    return yield dashboard_1.default(this.apiImpl, options);
                }
                if (id === constants_1.VALIDATE_KEY_API) {
                    return yield validateKey_1.default(this.apiImpl, options);
                }
                // Do API key validation for the remaining APIs
                let apiFunction;
                if (id === constants_1.USERS_LIST_GET_API) {
                    apiFunction = usersGet_1.default;
                } else if (id === constants_1.USERS_COUNT_API) {
                    apiFunction = usersCountGet_1.default;
                }
                // If the id doesnt match any APIs return false
                if (apiFunction === undefined) {
                    return false;
                }
                return yield apiKeyProtector_1.default(this.apiImpl, options, apiFunction);
            });
        this.handleError = (err, _, __) =>
            __awaiter(this, void 0, void 0, function* () {
                throw err;
            });
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
        };
        this.returnAPIIdIfCanHandleRequest = (path, method) => {
            const dashboardBundlePath = this.getAppInfo().apiBasePath.appendPath(
                new normalisedURLPath_1.default(constants_1.DASHBOARD_API)
            );
            if (utils_1.isApiPath(path, this.getAppInfo())) {
                return utils_1.getApiIdIfMatched(path, method);
            }
            if (path.startsWith(dashboardBundlePath)) {
                return constants_1.DASHBOARD_API;
            }
            return undefined;
        };
        this.config = utils_1.validateAndNormaliseUserInput(config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let builder = new supertokens_js_override_1.default(recipeImplementation_1.default());
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return Recipe.instance;
            } else {
                throw new Error(
                    "Emailverification recipe has already been initialised. Please check your code for bugs."
                );
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "dashboard";
