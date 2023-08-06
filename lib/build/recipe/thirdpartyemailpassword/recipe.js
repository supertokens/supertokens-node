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
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const recipe_1 = __importDefault(require("../emailpassword/recipe"));
const recipe_2 = __importDefault(require("../thirdparty/recipe"));
const error_1 = __importDefault(require("./error"));
const utils_1 = require("./utils");
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const emailPasswordRecipeImplementation_1 = __importDefault(
    require("./recipeImplementation/emailPasswordRecipeImplementation")
);
const thirdPartyRecipeImplementation_1 = __importDefault(
    require("./recipeImplementation/thirdPartyRecipeImplementation")
);
const thirdPartyAPIImplementation_1 = __importDefault(require("./api/thirdPartyAPIImplementation"));
const emailPasswordAPIImplementation_1 = __importDefault(require("./api/emailPasswordAPIImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const querier_1 = require("../../querier");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const emaildelivery_1 = __importDefault(require("../../ingredients/emaildelivery"));
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config, recipes, ingredients) {
        super(recipeId, appInfo);
        this.getAPIsHandled = () => {
            let apisHandled = [...this.emailPasswordRecipe.getAPIsHandled()];
            apisHandled.push(...this.thirdPartyRecipe.getAPIsHandled());
            return apisHandled;
        };
        this.handleAPIRequest = async (id, tenantId, req, res, path, method, userContext) => {
            if (
                (await this.emailPasswordRecipe.returnAPIIdIfCanHandleRequest(path, method, userContext)) !== undefined
            ) {
                return await this.emailPasswordRecipe.handleAPIRequest(
                    id,
                    tenantId,
                    req,
                    res,
                    path,
                    method,
                    userContext
                );
            }
            if ((await this.thirdPartyRecipe.returnAPIIdIfCanHandleRequest(path, method, userContext)) !== undefined) {
                return await this.thirdPartyRecipe.handleAPIRequest(id, tenantId, req, res, path, method, userContext);
            }
            return false;
        };
        this.handleError = async (err, request, response) => {
            if (err.fromRecipe === Recipe.RECIPE_ID) {
                throw err;
            } else {
                if (this.emailPasswordRecipe.isErrorFromThisRecipe(err)) {
                    return await this.emailPasswordRecipe.handleError(err, request, response);
                } else if (this.thirdPartyRecipe.isErrorFromThisRecipe(err)) {
                    return await this.thirdPartyRecipe.handleError(err, request, response);
                }
                throw err;
            }
        };
        this.getAllCORSHeaders = () => {
            let corsHeaders = [...this.emailPasswordRecipe.getAllCORSHeaders()];
            corsHeaders.push(...this.thirdPartyRecipe.getAllCORSHeaders());
            return corsHeaders;
        };
        this.isErrorFromThisRecipe = (err) => {
            return (
                error_1.default.isErrorFromSuperTokens(err) &&
                (err.fromRecipe === Recipe.RECIPE_ID ||
                    this.emailPasswordRecipe.isErrorFromThisRecipe(err) ||
                    this.thirdPartyRecipe.isErrorFromThisRecipe(err))
            );
        };
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            const getEmailPasswordConfig = () => this.emailPasswordRecipe.config;
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(
                    querier_1.Querier.getNewInstanceOrThrowError(recipe_1.default.RECIPE_ID),
                    getEmailPasswordConfig,
                    querier_1.Querier.getNewInstanceOrThrowError(recipe_2.default.RECIPE_ID),
                    this.config.providers
                )
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
        let emailPasswordRecipeImplementation = emailPasswordRecipeImplementation_1.default(this.recipeInterfaceImpl);
        /**
         * emailDelivery will always needs to be declared after isInServerlessEnv
         * and recipeInterfaceImpl values are set
         */
        this.emailDelivery =
            ingredients.emailDelivery === undefined
                ? new emaildelivery_1.default(this.config.getEmailDeliveryConfig(this.isInServerlessEnv))
                : ingredients.emailDelivery;
        this.emailPasswordRecipe =
            recipes.emailPasswordInstance !== undefined
                ? recipes.emailPasswordInstance
                : new recipe_1.default(
                      recipeId,
                      appInfo,
                      isInServerlessEnv,
                      {
                          override: {
                              functions: (_) => {
                                  return emailPasswordRecipeImplementation;
                              },
                              apis: (_) => {
                                  return emailPasswordAPIImplementation_1.default(this.apiImpl);
                              },
                          },
                          signUpFeature: {
                              formFields: this.config.signUpFeature.formFields,
                          },
                      },
                      {
                          emailDelivery: this.emailDelivery,
                      }
                  );
        this.thirdPartyRecipe =
            recipes.thirdPartyInstance !== undefined
                ? recipes.thirdPartyInstance
                : new recipe_2.default(
                      recipeId,
                      appInfo,
                      isInServerlessEnv,
                      {
                          override: {
                              functions: (_) => {
                                  return thirdPartyRecipeImplementation_1.default(this.recipeInterfaceImpl);
                              },
                              apis: (_) => {
                                  return thirdPartyAPIImplementation_1.default(this.apiImpl);
                              },
                          },
                          signInAndUpFeature: {
                              providers: this.config.providers,
                          },
                      },
                      {},
                      {
                          emailDelivery: this.emailDelivery,
                      }
                  );
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    config,
                    {
                        emailPasswordInstance: undefined,
                        thirdPartyInstance: undefined,
                    },
                    {
                        emailDelivery: undefined,
                    }
                );
                return Recipe.instance;
            } else {
                throw new Error(
                    "ThirdPartyEmailPassword recipe has already been initialised. Please check your code for bugs."
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
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "thirdpartyemailpassword";
