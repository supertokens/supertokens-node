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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const utils_1 = require("./utils");
const recipe_1 = __importDefault(require("../multitenancy/recipe"));
const error_1 = __importDefault(require("./error"));
const constants_1 = require("./constants");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const signinup_1 = __importDefault(require("./api/signinup"));
const authorisationUrl_1 = __importDefault(require("./api/authorisationUrl"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const querier_1 = require("../../querier");
const appleRedirect_1 = __importDefault(require("./api/appleRedirect"));
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
const multifactorauth_1 = require("../multifactorauth");
const utils_2 = require("../../utils");
const plugins_1 = require("../../plugins");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config, _recipes, _ingredients) {
        super(recipeId, appInfo);
        this.getAPIsHandled = () => {
            return [
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGN_IN_UP_API),
                    id: constants_1.SIGN_IN_UP_API,
                    disabled: this.apiImpl.signInUpPOST === undefined,
                },
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.AUTHORISATION_API),
                    id: constants_1.AUTHORISATION_API,
                    disabled: this.apiImpl.authorisationUrlGET === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.APPLE_REDIRECT_HANDLER),
                    id: constants_1.APPLE_REDIRECT_HANDLER,
                    disabled: this.apiImpl.appleRedirectHandlerPOST === undefined,
                },
            ];
        };
        this.handleAPIRequest = async (id, tenantId, req, res, _path, _method, userContext) => {
            let options = {
                config: this.config,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                recipeImplementation: this.recipeInterfaceImpl,
                providers: this.providers,
                req,
                res,
                appInfo: this.getAppInfo(),
            };
            if (id === constants_1.SIGN_IN_UP_API) {
                return await (0, signinup_1.default)(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.AUTHORISATION_API) {
                return await (0, authorisationUrl_1.default)(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.APPLE_REDIRECT_HANDLER) {
                return await (0, appleRedirect_1.default)(this.apiImpl, options, userContext);
            }
            return false;
        };
        this.handleError = async (err, _request, _response) => {
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
        this.providers = this.config.signInAndUpFeature.providers;
        {
            let builder = new supertokens_js_override_1.default(
                (0, recipeImplementation_1.default)(
                    querier_1.Querier.getNewInstanceOrThrowError(recipeId),
                    this.providers
                )
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default((0, implementation_1.default)());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
        postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            const mtRecipe = recipe_1.default.getInstance();
            if (mtRecipe !== undefined) {
                mtRecipe.staticThirdPartyProviders = this.config.signInAndUpFeature.providers;
                mtRecipe.allAvailableFirstFactors.push(multifactorauth_1.FactorIds.THIRDPARTY);
            }
        });
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
                    ),
                    {},
                    {
                        emailDelivery: undefined,
                    }
                );
                return Recipe.instance;
            } else {
                throw new Error("ThirdParty recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the ThirdParty.init function?");
    }
    static reset() {
        if (!(0, utils_2.isTestEnv)()) {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
}
Recipe.instance = undefined;
Recipe.RECIPE_ID = "thirdparty";
exports.default = Recipe;
