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
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const error_1 = __importDefault(require("../../error"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const constants_1 = require("./constants");
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
const utils_1 = require("./utils");
const resyncSessionAndFetchMFAInfo_1 = __importDefault(require("./api/resyncSessionAndFetchMFAInfo"));
const recipe_1 = __importDefault(require("../session/recipe"));
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
const recipe_2 = __importDefault(require("../multitenancy/recipe"));
const querier_1 = require("../../querier");
const utils_2 = require("../../utils");
const plugins_1 = require("../../plugins");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        var _a;
        super(recipeId, appInfo);
        this.getFactorsSetupForUserFromOtherRecipesFuncs = [];
        this.getAllAvailableSecondaryFactorIdsFromOtherRecipesFuncs = [];
        this.getEmailsForFactorFromOtherRecipesFunc = [];
        this.getPhoneNumbersForFactorFromOtherRecipesFunc = [];
        this.isGetMfaRequirementsForAuthOverridden = false;
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    method: "put",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        constants_1.RESYNC_SESSION_AND_FETCH_MFA_INFO
                    ),
                    id: constants_1.RESYNC_SESSION_AND_FETCH_MFA_INFO,
                    disabled: this.apiImpl.resyncSessionAndFetchMFAInfoPUT === undefined,
                },
            ];
        };
        this.handleAPIRequest = async (id, _tenantId, req, res, _, __, userContext) => {
            let options = {
                recipeInstance: this,
                recipeImplementation: this.recipeInterfaceImpl,
                config: this.config,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                req,
                res,
            };
            if (id === constants_1.RESYNC_SESSION_AND_FETCH_MFA_INFO) {
                return await (0, resyncSessionAndFetchMFAInfo_1.default)(this.apiImpl, options, userContext);
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
        this.addFuncToGetAllAvailableSecondaryFactorIdsFromOtherRecipes = (f) => {
            this.getAllAvailableSecondaryFactorIdsFromOtherRecipesFuncs.push(f);
        };
        this.getAllAvailableSecondaryFactorIds = (tenantConfig) => {
            let factorIds = [];
            for (const func of this.getAllAvailableSecondaryFactorIdsFromOtherRecipesFuncs) {
                const factorIdsRes = func(tenantConfig);
                for (const factorId of factorIdsRes) {
                    if (!factorIds.includes(factorId)) {
                        factorIds.push(factorId);
                    }
                }
            }
            return factorIds;
        };
        this.addFuncToGetFactorsSetupForUserFromOtherRecipes = (func) => {
            this.getFactorsSetupForUserFromOtherRecipesFuncs.push(func);
        };
        this.addFuncToGetEmailsForFactorFromOtherRecipes = (func) => {
            this.getEmailsForFactorFromOtherRecipesFunc.push(func);
        };
        this.getEmailsForFactors = (user, sessionRecipeUserId) => {
            let result = {
                status: "OK",
                factorIdToEmailsMap: {},
            };
            for (const func of this.getEmailsForFactorFromOtherRecipesFunc) {
                let funcResult = func(user, sessionRecipeUserId);
                if (funcResult.status === "UNKNOWN_SESSION_RECIPE_USER_ID") {
                    return {
                        status: "UNKNOWN_SESSION_RECIPE_USER_ID",
                    };
                }
                result.factorIdToEmailsMap = Object.assign(
                    Object.assign({}, result.factorIdToEmailsMap),
                    funcResult.factorIdToEmailsMap
                );
            }
            return result;
        };
        this.addFuncToGetPhoneNumbersForFactorsFromOtherRecipes = (func) => {
            this.getPhoneNumbersForFactorFromOtherRecipesFunc.push(func);
        };
        this.getPhoneNumbersForFactors = (user, sessionRecipeUserId) => {
            let result = {
                status: "OK",
                factorIdToPhoneNumberMap: {},
            };
            for (const func of this.getPhoneNumbersForFactorFromOtherRecipesFunc) {
                let funcResult = func(user, sessionRecipeUserId);
                if (funcResult.status === "UNKNOWN_SESSION_RECIPE_USER_ID") {
                    return {
                        status: "UNKNOWN_SESSION_RECIPE_USER_ID",
                    };
                }
                result.factorIdToPhoneNumberMap = Object.assign(
                    Object.assign({}, result.factorIdToPhoneNumberMap),
                    funcResult.factorIdToPhoneNumberMap
                );
            }
            return result;
        };
        this.config = (0, utils_1.validateAndNormaliseUserInput)(config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let originalImpl = (0, recipeImplementation_1.default)(this);
            let builder = new supertokens_js_override_1.default(originalImpl);
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
            if (
                ((_a = config === null || config === void 0 ? void 0 : config.override) === null || _a === void 0
                    ? void 0
                    : _a.functions) !== undefined
            ) {
                this.isGetMfaRequirementsForAuthOverridden = true; // assuming that's what most people will override
            }
        }
        {
            let builder = new supertokens_js_override_1.default((0, implementation_1.default)());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
        postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            const mtRecipe = recipe_2.default.getInstance();
            if (mtRecipe !== undefined) {
                mtRecipe.staticFirstFactors = this.config.firstFactors;
            }
            // We don't add MultiFactorAuthClaim as a global claim because the values are populated
            // on factor setup / completion any way (in the sign in / up APIs).
            // SessionRecipe.getInstanceOrThrowError().addClaimFromOtherRecipe(MultiFactorAuthClaim);
            recipe_1.default
                .getInstanceOrThrowError()
                .addClaimValidatorFromOtherRecipe(
                    multiFactorAuthClaim_1.MultiFactorAuthClaim.validators.hasCompletedMFARequirementsForAuth()
                );
        });
        this.querier = querier_1.Querier.getNewInstanceOrThrowError(recipeId);
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the MultiFactorAuth.init function?");
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
                throw new Error(
                    "MultiFactorAuth recipe has already been initialised. Please check your code for bugs."
                );
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
Recipe.RECIPE_ID = "multifactorauth";
exports.default = Recipe;
