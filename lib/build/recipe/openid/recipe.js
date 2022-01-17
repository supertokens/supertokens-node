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
const error_1 = require("../../error");
const recipeModule_1 = require("../../recipeModule");
const utils_1 = require("./utils");
const recipe_1 = require("../jwt/recipe");
const supertokens_js_override_1 = require("supertokens-js-override");
const recipeImplementation_1 = require("./recipeImplementation");
const implementation_1 = require("./api/implementation");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const constants_1 = require("./constants");
const getOpenIdDiscoveryConfiguration_1 = require("./api/getOpenIdDiscoveryConfiguration");
class OpenIdRecipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        this.getAPIsHandled = () => {
            return [
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.GET_DISCOVERY_CONFIG_URL),
                    id: constants_1.GET_DISCOVERY_CONFIG_URL,
                    disabled: this.apiImpl.getOpenIdDiscoveryConfigurationGET === undefined,
                },
                ...this.jwtRecipe.getAPIsHandled(),
            ];
        };
        this.handleAPIRequest = (id, req, response, path, method) =>
            __awaiter(this, void 0, void 0, function* () {
                let apiOptions = {
                    recipeImplementation: this.recipeImplementation,
                    config: this.config,
                    recipeId: this.getRecipeId(),
                    req,
                    res: response,
                };
                if (id === constants_1.GET_DISCOVERY_CONFIG_URL) {
                    return yield getOpenIdDiscoveryConfiguration_1.default(this.apiImpl, apiOptions);
                } else {
                    return this.jwtRecipe.handleAPIRequest(id, req, response, path, method);
                }
            });
        this.handleError = (error, request, response) =>
            __awaiter(this, void 0, void 0, function* () {
                if (error.fromRecipe === OpenIdRecipe.RECIPE_ID) {
                    throw error;
                } else {
                    return yield this.jwtRecipe.handleError(error, request, response);
                }
            });
        this.getAllCORSHeaders = () => {
            return [...this.jwtRecipe.getAllCORSHeaders()];
        };
        this.isErrorFromThisRecipe = (err) => {
            return (
                (error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === OpenIdRecipe.RECIPE_ID) ||
                this.jwtRecipe.isErrorFromThisRecipe(err)
            );
        };
        this.config = utils_1.validateAndNormaliseUserInput(appInfo, config);
        this.jwtRecipe = new recipe_1.default(recipeId, appInfo, isInServerlessEnv, {
            jwtValiditySeconds: this.config.jwtValiditySeconds,
            override: this.config.override.jwtFeature,
        });
        let builder = new supertokens_js_override_1.default(
            recipeImplementation_1.default(this.config, this.jwtRecipe.recipeInterfaceImpl)
        );
        this.recipeImplementation = builder.override(this.config.override.functions).build();
        let apiBuilder = new supertokens_js_override_1.default(implementation_1.default());
        this.apiImpl = apiBuilder.override(this.config.override.apis).build();
    }
    static getInstanceOrThrowError() {
        if (OpenIdRecipe.instance !== undefined) {
            return OpenIdRecipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (OpenIdRecipe.instance === undefined) {
                OpenIdRecipe.instance = new OpenIdRecipe(OpenIdRecipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return OpenIdRecipe.instance;
            } else {
                throw new Error("OpenId recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        OpenIdRecipe.instance = undefined;
    }
}
exports.default = OpenIdRecipe;
OpenIdRecipe.RECIPE_ID = "openid";
OpenIdRecipe.instance = undefined;
