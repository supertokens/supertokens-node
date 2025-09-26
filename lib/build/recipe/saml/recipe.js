"use strict";
/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const querier_1 = require("../../querier");
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const error_1 = __importDefault(require("../../error"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const login_1 = __importDefault(require("./api/login"));
const callback_1 = __importDefault(require("./api/callback"));
const utils_2 = require("../../utils");
const plugins_1 = require("../../plugins");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SAML_LOGIN),
                    id: constants_1.SAML_LOGIN,
                    disabled: this.apiImpl.loginGET === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SAML_CALLBACK),
                    id: constants_1.SAML_CALLBACK,
                    disabled: this.apiImpl.callbackPOST === undefined,
                },
            ];
        };
        this.handleAPIRequest = async (id, tenantId, req, res, _, __, userContext) => {
            let options = {
                recipeImplementation: this.recipeInterfaceImpl,
                config: this.config,
                appInfo: this.appInfo,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                req,
                res,
            };
            if (id === constants_1.SAML_LOGIN) {
                return await (0, login_1.default)(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.SAML_CALLBACK) {
                return await (0, callback_1.default)(this.apiImpl, tenantId, options, userContext);
            }
            throw new Error("should never come here");
        };
        this.handleError = async (err, _, __) => {
            throw err;
        };
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
        };
        this.config = (0, utils_1.validateAndNormaliseUserInput)(appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let builder = new supertokens_js_override_1.default(
                (0, recipeImplementation_1.default)(querier_1.Querier.getNewInstanceOrThrowError(recipeId), this.config)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default((0, implementation_1.default)());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SAML.init function?");
    }
    static getInstance() {
        return Recipe.instance;
    }
    static init(config) {
        return (appInfo, isInServerlessEnv, plugins) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    (0, plugins_1.applyPlugins)(
                        Recipe.RECIPE_ID,
                        config,
                        plugins !== null && plugins !== void 0 ? plugins : []
                    )
                );
                return Recipe.instance;
            } else {
                throw new Error("SAML recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (!(0, utils_2.isTestEnv)()) {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
}
Recipe.instance = undefined;
Recipe.RECIPE_ID = "saml";
exports.default = Recipe;
