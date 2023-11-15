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
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const querier_1 = require("../../querier");
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const error_1 = __importDefault(require("../../error"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const constants_1 = require("./constants");
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
const utils_1 = require("./utils");
const mfaInfo_1 = __importDefault(require("./api/mfaInfo"));
const recipe_1 = __importDefault(require("../session/recipe"));
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        this.factorsSetupByOtherRecipes = [];
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.GET_MFA_INFO),
                    id: constants_1.GET_MFA_INFO,
                    disabled: this.apiImpl.mfaInfoGET === undefined,
                },
            ];
        };
        this.handleAPIRequest = async (id, _tenantId, req, res, _, __, userContext) => {
            let options = {
                recipeImplementation: this.recipeInterfaceImpl,
                config: this.config,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                req,
                res,
            };
            if (id === constants_1.GET_MFA_INFO) {
                return await mfaInfo_1.default(this.apiImpl, options, userContext);
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
        this.addFactorsSetupFromOtherRecipes = (factors) => {
            this.factorsSetupByOtherRecipes.push(...factors);
        };
        this.getFactorsSetupByOtherRecipes = () => {
            return this.factorsSetupByOtherRecipes;
        };
        this.config = utils_1.validateAndNormaliseUserInput(config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(querier_1.Querier.getNewInstanceOrThrowError(recipeId), this)
            );
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
    static getInstance() {
        return Recipe.instance;
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                // We do not want to add the MFA claim as a global claim (which would make createNewSession set it up)
                // because we want to add it in the sign-in APIs manually.
                postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                    recipe_1.default
                        .getInstanceOrThrowError()
                        .addClaimValidatorFromOtherRecipe(
                            multiFactorAuthClaim_1.MultiFactorAuthClaim.validators.passesMFARequirements()
                        );
                });
                return Recipe.instance;
            } else {
                throw new Error(
                    "MultiFactorAuth recipe has already been initialised. Please check your code for bugs."
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
Recipe.RECIPE_ID = "multifactorauth";
