"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
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
const error_1 = __importDefault(require("../../error"));
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const utils_1 = require("./utils");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const constants_1 = require("./constants");
const getOpenIdDiscoveryConfiguration_1 = __importDefault(require("./api/getOpenIdDiscoveryConfiguration"));
const utils_2 = require("../../utils");
const plugins_1 = require("../../plugins");
class OpenIdRecipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config) {
        super(recipeId, appInfo);
        this.getAPIsHandled = () => {
            return [
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.GET_DISCOVERY_CONFIG_URL),
                    id: constants_1.GET_DISCOVERY_CONFIG_URL,
                    disabled: this.apiImpl.getOpenIdDiscoveryConfigurationGET === undefined,
                },
            ];
        };
        this.handleAPIRequest = async (id, _tenantId, req, response, _path, _method, userContext) => {
            let apiOptions = {
                recipeImplementation: this.recipeImplementation,
                config: this.config,
                recipeId: this.getRecipeId(),
                req,
                res: response,
            };
            if (id === constants_1.GET_DISCOVERY_CONFIG_URL) {
                return await (0, getOpenIdDiscoveryConfiguration_1.default)(this.apiImpl, apiOptions, userContext);
            } else {
                return false;
            }
        };
        this.handleError = async (error) => {
            throw error;
        };
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === OpenIdRecipe.RECIPE_ID;
        };
        this.config = (0, utils_1.validateAndNormaliseUserInput)(config);
        let builder = new supertokens_js_override_1.default((0, recipeImplementation_1.default)(appInfo));
        this.recipeImplementation = builder.override(this.config.override.functions).build();
        let apiBuilder = new supertokens_js_override_1.default((0, implementation_1.default)());
        this.apiImpl = apiBuilder.override(this.config.override.apis).build();
    }
    static getInstanceOrThrowError() {
        if (OpenIdRecipe.instance !== undefined) {
            return OpenIdRecipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Openid.init function?");
    }
    static init(config) {
        return (appInfo, _isInServerlessEnv, plugins) => {
            if (OpenIdRecipe.instance === undefined) {
                OpenIdRecipe.instance = new OpenIdRecipe(
                    OpenIdRecipe.RECIPE_ID,
                    appInfo,
                    (0, plugins_1.applyPlugins)(
                        OpenIdRecipe.RECIPE_ID,
                        config,
                        plugins !== null && plugins !== void 0 ? plugins : []
                    )
                );
                return OpenIdRecipe.instance;
            } else {
                throw new Error("OpenId recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (!(0, utils_2.isTestEnv)()) {
            throw new Error("calling testing function in non testing env");
        }
        OpenIdRecipe.instance = undefined;
    }
    static async getIssuer(userContext) {
        return (
            await this.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration({ userContext })
        ).issuer;
    }
}
OpenIdRecipe.RECIPE_ID = "openid";
OpenIdRecipe.instance = undefined;
exports.default = OpenIdRecipe;
