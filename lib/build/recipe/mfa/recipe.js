"use strict";
/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const error_1 = __importDefault(require("./error"));
const querier_1 = require("../../querier");
const factorIsSetup_1 = __importDefault(require("./api/factorIsSetup"));
const listFactors_1 = __importDefault(require("./api/listFactors"));
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
const mfaClaim_1 = require("./mfaClaim");
const recipe_1 = __importDefault(require("../session/recipe"));
class MfaRecipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    id: constants_1.FACTOR_IS_SETUP_API,
                    disabled: this.apiImpl.isFactorAlreadySetupForUserGET === undefined,
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.FACTOR_IS_SETUP_API),
                },
                {
                    id: constants_1.LIST_FACTORS_API,
                    disabled: this.apiImpl.listFactorsGET === undefined,
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.LIST_FACTORS_API),
                },
            ];
        };
        this.handleAPIRequest = (id, req, res, _, __) =>
            __awaiter(this, void 0, void 0, function* () {
                const options = {
                    config: this.config,
                    recipeId: this.getRecipeId(),
                    isInServerlessEnv: this.isInServerlessEnv,
                    recipeImplementation: this.recipeInterfaceImpl,
                    req,
                    res,
                    appInfo: this.getAppInfo(),
                };
                if (id === constants_1.FACTOR_IS_SETUP_API) {
                    return yield factorIsSetup_1.default(this.apiImpl, options);
                } else if (id === constants_1.LIST_FACTORS_API) {
                    return yield listFactors_1.default(this.apiImpl, options);
                }
                return false;
            });
        this.handleError = (err, _, _res) =>
            __awaiter(this, void 0, void 0, function* () {
                // if (err.fromRecipe === MfaRecipe.RECIPE_ID) {
                //     if (err.type === TotpError.TOTP_NOT_ENABLED_ERROR) {
                //         sendNon200ResponseWithMessage(res, "MFA is not enabled for the user", 403); // bad req
                //     }
                // }
                throw err;
            });
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === MfaRecipe.RECIPE_ID;
        };
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        {
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(querier_1.Querier.getNewInstanceOrThrowError(recipeId), this.config)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }
    static getInstanceOrThrowError() {
        if (MfaRecipe.instance !== undefined) {
            return MfaRecipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init or totp.init function?");
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (MfaRecipe.instance === undefined) {
                MfaRecipe.instance = new MfaRecipe(MfaRecipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                    recipe_1.default.getInstanceOrThrowError().addClaimFromOtherRecipe(mfaClaim_1.MfaClaim);
                    recipe_1.default
                        .getInstanceOrThrowError()
                        .addClaimValidatorFromOtherRecipe(mfaClaim_1.MfaClaim.validators.hasCompletedFactors());
                });
                return MfaRecipe.instance;
            } else {
                throw new Error("MFA recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        MfaRecipe.instance = undefined;
    }
}
exports.default = MfaRecipe;
MfaRecipe.instance = undefined;
MfaRecipe.RECIPE_ID = "mfa";
