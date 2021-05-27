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
const recipeModule_1 = require("../../recipeModule");
const recipe_1 = require("../emailverification/recipe");
const recipe_2 = require("../emailpassword/recipe");
const recipe_3 = require("../thirdparty/recipe");
const error_1 = require("./error");
const utils_1 = require("./utils");
const recipeImplementation_1 = require("./recipeImplementation");
const emailPasswordRecipeImplementation_1 = require("./recipeImplementation/emailPasswordRecipeImplementation");
const thirdPartyRecipeImplementation_1 = require("./recipeImplementation/thirdPartyRecipeImplementation");
const thirdPartyAPIImplementation_1 = require("./api/thirdPartyAPIImplementation");
const emailPasswordAPIImplementation_1 = require("./api/emailPasswordAPIImplementation");
const implementation_1 = require("./api/implementation");
const querier_1 = require("../../querier");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        this.getAPIsHandled = () => {
            let apisHandled = [
                ...this.emailPasswordRecipe.getAPIsHandled(),
                ...this.emailVerificationRecipe.getAPIsHandled(),
            ];
            if (this.thirdPartyRecipe !== undefined) {
                apisHandled.push(...this.thirdPartyRecipe.getAPIsHandled());
            }
            return apisHandled;
        };
        this.handleAPIRequest = (id, req, res, next, path, method) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.emailPasswordRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined) {
                    return yield this.emailPasswordRecipe.handleAPIRequest(id, req, res, next, path, method);
                }
                if (
                    this.thirdPartyRecipe !== undefined &&
                    this.thirdPartyRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined
                ) {
                    return yield this.thirdPartyRecipe.handleAPIRequest(id, req, res, next, path, method);
                }
                return yield this.emailVerificationRecipe.handleAPIRequest(id, req, res, next, path, method);
            });
        this.handleError = (err, request, response, next) => {
            if (err.fromRecipe === Recipe.RECIPE_ID) {
                next(err);
            } else {
                if (this.emailPasswordRecipe.isErrorFromThisRecipe(err)) {
                    return this.emailPasswordRecipe.handleError(err, request, response, next);
                } else if (this.thirdPartyRecipe !== undefined && this.thirdPartyRecipe.isErrorFromThisRecipe(err)) {
                    return this.thirdPartyRecipe.handleError(err, request, response, next);
                }
                return this.emailVerificationRecipe.handleError(err, request, response, next);
            }
        };
        this.getAllCORSHeaders = () => {
            let corsHeaders = [
                ...this.emailVerificationRecipe.getAllCORSHeaders(),
                ...this.emailPasswordRecipe.getAllCORSHeaders(),
            ];
            if (this.thirdPartyRecipe !== undefined) {
                corsHeaders.push(...this.thirdPartyRecipe.getAllCORSHeaders());
            }
            return corsHeaders;
        };
        this.isErrorFromThisRecipe = (err) => {
            return (
                error_1.default.isErrorFromSuperTokens(err) &&
                (err.fromRecipe === Recipe.RECIPE_ID ||
                    this.emailVerificationRecipe.isErrorFromThisRecipe(err) ||
                    this.emailPasswordRecipe.isErrorFromThisRecipe(err) ||
                    (this.thirdPartyRecipe !== undefined && this.thirdPartyRecipe.isErrorFromThisRecipe(err)))
            );
        };
        // helper functions...
        this.getEmailForUserId = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                let userInfo = yield this.recipeInterfaceImpl.getUserById(userId);
                if (userInfo === undefined) {
                    throw new Error("Unknown User ID provided");
                }
                return userInfo.email;
            });
        this.createEmailVerificationToken = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailVerificationRecipe.createEmailVerificationToken(
                    userId,
                    yield this.getEmailForUserId(userId)
                );
            });
        this.verifyEmailUsingToken = (token) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield this.emailVerificationRecipe.verifyEmailUsingToken(token);
                let userInThisRecipe = yield this.recipeInterfaceImpl.getUserById(user.id);
                if (userInThisRecipe === undefined) {
                    throw new Error("Unknown User ID provided");
                }
                return userInThisRecipe;
            });
        this.isEmailVerified = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailVerificationRecipe.recipeInterfaceImpl.isEmailVerified(
                    userId,
                    yield this.getEmailForUserId(userId)
                );
            });
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        this.recipeInterfaceImpl = this.config.override.functions(
            new recipeImplementation_1.default(
                querier_1.Querier.getNewInstanceOrThrowError(isInServerlessEnv, recipe_2.default.RECIPE_ID),
                querier_1.Querier.getNewInstanceOrThrowError(isInServerlessEnv, recipe_3.default.RECIPE_ID)
            )
        );
        this.apiImpl = this.config.override.apis(new implementation_1.default());
        this.emailPasswordRecipe = new recipe_2.default(recipeId, appInfo, isInServerlessEnv, {
            override: {
                functions: (_) => {
                    return new emailPasswordRecipeImplementation_1.default(this.recipeInterfaceImpl);
                },
                apis: (_) => {
                    return emailPasswordAPIImplementation_1.default(this.apiImpl);
                },
                emailVerificationFeature: {
                    apis: (_) => {
                        return {
                            generateEmailVerifyTokenPOST: undefined,
                            isEmailVerifiedGET: undefined,
                            verifyEmailPOST: undefined,
                        };
                    },
                },
            },
            sessionFeature: {
                setJwtPayload: (user, formfields, action) =>
                    __awaiter(this, void 0, void 0, function* () {
                        return this.config.sessionFeature.setJwtPayload(
                            user,
                            {
                                loginType: "emailpassword",
                                formFields: formfields,
                            },
                            action
                        );
                    }),
                setSessionData: (user, formfields, action) =>
                    __awaiter(this, void 0, void 0, function* () {
                        return this.config.sessionFeature.setSessionData(
                            user,
                            {
                                loginType: "emailpassword",
                                formFields: formfields,
                            },
                            action
                        );
                    }),
            },
            signUpFeature: {
                formFields: this.config.signUpFeature.formFields,
            },
            resetPasswordUsingTokenFeature: this.config.resetPasswordUsingTokenFeature,
        });
        if (this.config.providers.length !== 0) {
            this.thirdPartyRecipe = new recipe_3.default(recipeId, appInfo, isInServerlessEnv, {
                override: {
                    functions: (_) => {
                        return new thirdPartyRecipeImplementation_1.default(this.recipeInterfaceImpl);
                    },
                    apis: (_) => {
                        return thirdPartyAPIImplementation_1.default(this.apiImpl);
                    },
                    emailVerificationFeature: {
                        apis: (_) => {
                            return {
                                generateEmailVerifyTokenPOST: undefined,
                                isEmailVerifiedGET: undefined,
                                verifyEmailPOST: undefined,
                            };
                        },
                    },
                },
                sessionFeature: {
                    setJwtPayload: (user, thirdPartyAuthCodeResponse, action) =>
                        __awaiter(this, void 0, void 0, function* () {
                            return this.config.sessionFeature.setJwtPayload(
                                user,
                                {
                                    loginType: "thirdparty",
                                    thirdPartyAuthCodeResponse: thirdPartyAuthCodeResponse,
                                },
                                action
                            );
                        }),
                    setSessionData: (user, thirdPartyAuthCodeResponse, action) =>
                        __awaiter(this, void 0, void 0, function* () {
                            return this.config.sessionFeature.setSessionData(
                                user,
                                {
                                    loginType: "thirdparty",
                                    thirdPartyAuthCodeResponse: thirdPartyAuthCodeResponse,
                                },
                                action
                            );
                        }),
                },
                signInAndUpFeature: {
                    providers: this.config.providers,
                },
            });
        }
        this.emailVerificationRecipe = new recipe_1.default(
            recipeId,
            appInfo,
            isInServerlessEnv,
            this.config.emailVerificationFeature
        );
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return Recipe.instance;
            } else {
                throw new error_1.default({
                    type: error_1.default.GENERAL_ERROR,
                    payload: new Error(
                        "ThirdPartyEmailPassword recipe has already been initialised. Please check your code for bugs."
                    ),
                });
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                payload: new Error("calling testing function in non testing env"),
            });
        }
        Recipe.instance = undefined;
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            payload: new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?"),
        });
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "thirdpartyemailpassword";
//# sourceMappingURL=recipe.js.map
