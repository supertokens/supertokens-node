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
const signinup_1 = require("./api/signinup");
const authorisationUrl_1 = require("./api/authorisationUrl");
const recipeImplementation_1 = require("./recipeImplementation");
const implementation_1 = require("./api/implementation");
const querier_1 = require("../../querier");
const appleRedirect_1 = require("./api/appleRedirect");
const supertokens_js_override_1 = require("supertokens-js-override");
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
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
        this.handleAPIRequest = (id, req, res, _path, _method) =>
            __awaiter(this, void 0, void 0, function* () {
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
                    return yield signinup_1.default(this.apiImpl, options);
                } else if (id === constants_1.AUTHORISATION_API) {
                    return yield authorisationUrl_1.default(this.apiImpl, options);
                } else if (id === constants_1.APPLE_REDIRECT_HANDLER) {
                    return yield appleRedirect_1.default(this.apiImpl, options);
                }
                return false;
            });
        this.handleError = (err, _request, _response) =>
            __awaiter(this, void 0, void 0, function* () {
                throw err;
            });
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
        };
        // helper functions...
        this.getEmailForUserId = (userId, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                let userInfo = yield this.recipeInterfaceImpl.getUserById({ userId, userContext });
                if (userInfo !== undefined) {
                    return {
                        status: "OK",
                        email: userInfo.email,
                    };
                }
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            });
        this.config = utils_1.validateAndNormaliseUserInput(appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        this.providers = this.config.signInAndUpFeature.providers;
        {
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(querier_1.Querier.getNewInstanceOrThrowError(recipeId))
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
        postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            const emailVerificationRecipe = recipe_1.default.getInstance();
            if (emailVerificationRecipe !== undefined) {
                emailVerificationRecipe.addGetEmailForUserIdFunc(this.getEmailForUserId.bind(this));
            }
        });
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    config,
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
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
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
Recipe.RECIPE_ID = "thirdparty";
