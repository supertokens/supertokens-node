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
const error_1 = __importDefault(require("./error"));
const utils_1 = require("./utils");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const constants_1 = require("./constants");
const signup_1 = __importDefault(require("./api/signup"));
const signin_1 = __importDefault(require("./api/signin"));
const generatePasswordResetToken_1 = __importDefault(require("./api/generatePasswordResetToken"));
const passwordReset_1 = __importDefault(require("./api/passwordReset"));
const utils_2 = require("../../utils");
const emailExists_1 = __importDefault(require("./api/emailExists"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const querier_1 = require("../../querier");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const emaildelivery_1 = __importDefault(require("../../ingredients/emaildelivery"));
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config, ingredients) {
        super(recipeId, appInfo);
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGN_UP_API),
                    id: constants_1.SIGN_UP_API,
                    disabled: this.apiImpl.signUpPOST === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGN_IN_API),
                    id: constants_1.SIGN_IN_API,
                    disabled: this.apiImpl.signInPOST === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        constants_1.GENERATE_PASSWORD_RESET_TOKEN_API
                    ),
                    id: constants_1.GENERATE_PASSWORD_RESET_TOKEN_API,
                    disabled: this.apiImpl.generatePasswordResetTokenPOST === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.PASSWORD_RESET_API),
                    id: constants_1.PASSWORD_RESET_API,
                    disabled: this.apiImpl.passwordResetPOST === undefined,
                },
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGNUP_EMAIL_EXISTS_API),
                    id: constants_1.SIGNUP_EMAIL_EXISTS_API,
                    disabled: this.apiImpl.emailExistsGET === undefined,
                },
            ];
        };
        this.handleAPIRequest = async (id, tenantId, req, res, _path, _method, userContext) => {
            let options = {
                config: this.config,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                recipeImplementation: this.recipeInterfaceImpl,
                req,
                res,
                emailDelivery: this.emailDelivery,
                appInfo: this.getAppInfo(),
            };
            if (id === constants_1.SIGN_UP_API) {
                return await signup_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.SIGN_IN_API) {
                return await signin_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.GENERATE_PASSWORD_RESET_TOKEN_API) {
                return await generatePasswordResetToken_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.PASSWORD_RESET_API) {
                return await passwordReset_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.SIGNUP_EMAIL_EXISTS_API) {
                return await emailExists_1.default(this.apiImpl, tenantId, options, userContext);
            }
            return false;
        };
        this.handleError = async (err, _request, response) => {
            if (err.fromRecipe === Recipe.RECIPE_ID) {
                if (err.type === error_1.default.FIELD_ERROR) {
                    return utils_2.send200Response(response, {
                        status: "FIELD_ERROR",
                        formFields: err.payload,
                    });
                } else {
                    throw err;
                }
            } else {
                throw err;
            }
        };
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
        };
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        {
            const getEmailPasswordConfig = () => this.config;
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(
                    querier_1.Querier.getNewInstanceOrThrowError(recipeId),
                    getEmailPasswordConfig
                )
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
        /**
         * emailDelivery will always needs to be declared after isInServerlessEnv
         * and recipeInterfaceImpl values are set
         */
        this.emailDelivery =
            ingredients.emailDelivery === undefined
                ? new emaildelivery_1.default(this.config.getEmailDeliveryConfig(this.isInServerlessEnv))
                : ingredients.emailDelivery;
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
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
                    emailDelivery: undefined,
                });
                return Recipe.instance;
            } else {
                throw new Error("Emailpassword recipe has already been initialised. Please check your code for bugs.");
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
Recipe.RECIPE_ID = "emailpassword";
