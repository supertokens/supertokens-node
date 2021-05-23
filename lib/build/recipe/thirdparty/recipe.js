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
const recipeModule_1 = require("../../recipeModule");
const utils_1 = require("./utils");
const recipe_1 = require("../emailverification/recipe");
const error_1 = require("./error");
const constants_1 = require("./constants");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const signout_1 = require("./api/signout");
const signinup_1 = require("./api/signinup");
const authorisationUrl_1 = require("./api/authorisationUrl");
const utils_2 = require("../../utils");
const recipeImplementation_1 = require("./recipeImplementation");
const implementation_1 = require("./api/implementation");
const querier_1 = require("../../querier");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
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
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGN_OUT_API),
                    id: constants_1.SIGN_OUT_API,
                    disabled: this.apiImpl.signOutPOST === undefined,
                },
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.AUTHORISATION_API),
                    id: constants_1.AUTHORISATION_API,
                    disabled: this.apiImpl.authorisationUrlGET === undefined,
                },
                ...this.emailVerificationRecipe.getAPIsHandled(),
            ];
        };
        this.handleAPIRequest = (id, req, res, next, path, method) =>
            __awaiter(this, void 0, void 0, function* () {
                let options = {
                    config: this.config,
                    next,
                    recipeId: this.getRecipeId(),
                    recipeImplementation: this.recipeInterfaceImpl,
                    providers: this.providers,
                    req,
                    res,
                };
                if (id === constants_1.SIGN_IN_UP_API) {
                    return yield signinup_1.default(this.apiImpl, options);
                } else if (id === constants_1.SIGN_OUT_API) {
                    return yield signout_1.default(this.apiImpl, options);
                } else if (id === constants_1.AUTHORISATION_API) {
                    return yield authorisationUrl_1.default(this.apiImpl, options);
                } else {
                    return yield this.emailVerificationRecipe.handleAPIRequest(id, req, res, next, path, method);
                }
            });
        this.handleError = (err, request, response, next) => {
            if (err.fromRecipe === Recipe.RECIPE_ID) {
                if (err.type === error_1.default.NO_EMAIL_GIVEN_BY_PROVIDER) {
                    return utils_2.send200Response(response, {
                        status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                    });
                } else if (err.type === error_1.default.FIELD_ERROR) {
                    // Do not remove this error: This is needed so that custom error can be thrown to the frontend during sign up / in
                    return utils_2.send200Response(response, {
                        status: "FIELD_ERROR",
                        error: err.message,
                    });
                } else {
                    return next(err);
                }
            } else {
                return this.emailVerificationRecipe.handleError(err, request, response, next);
            }
        };
        this.getAllCORSHeaders = () => {
            return [...this.emailVerificationRecipe.getAllCORSHeaders()];
        };
        this.isErrorFromThisRecipe = (err) => {
            return (
                error_1.default.isErrorFromSuperTokens(err) &&
                (err.fromRecipe === Recipe.RECIPE_ID || this.emailVerificationRecipe.isErrorFromThisRecipe(err))
            );
        };
        // helper functions...
        this.getEmailForUserId = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                let userInfo = yield this.recipeInterfaceImpl.getUserById(userId);
                if (userInfo === undefined) {
                    throw new error_1.default({
                        type: error_1.default.UNKNOWN_USER_ID_ERROR,
                        message: "Unknown User ID provided",
                    });
                }
                return userInfo.email;
            });
        this.createEmailVerificationToken = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailVerificationRecipe.recipeInterfaceImpl.createEmailVerificationToken(
                    userId,
                    yield this.getEmailForUserId(userId)
                );
            });
        this.verifyEmailUsingToken = (token) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield this.emailVerificationRecipe.recipeInterfaceImpl.verifyEmailUsingToken(token);
                let userInThisRecipe = yield this.recipeInterfaceImpl.getUserById(user.id);
                if (userInThisRecipe === undefined) {
                    throw new error_1.default({
                        type: error_1.default.UNKNOWN_USER_ID_ERROR,
                        message: "Unknown User ID provided",
                    });
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
        this.emailVerificationRecipe = new recipe_1.default(
            recipeId,
            appInfo,
            isInServerlessEnv,
            this.config.emailVerificationFeature
        );
        this.providers = this.config.signInAndUpFeature.providers;
        this.recipeInterfaceImpl = this.config.override.functions(
            new recipeImplementation_1.default(
                querier_1.Querier.getNewInstanceOrThrowError(isInServerlessEnv, recipeId)
            )
        );
        this.apiImpl = this.config.override.apis(new implementation_1.default());
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
                        "ThirdParty recipe has already been initialised. Please check your code for bugs."
                    ),
                });
            }
        };
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
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                payload: new Error("calling testing function in non testing env"),
            });
        }
        Recipe.instance = undefined;
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "thirdparty";
//# sourceMappingURL=recipe.js.map
