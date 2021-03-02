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
const coreAPICalls_1 = require("./coreAPICalls");
const constants_1 = require("./constants");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const signout_1 = require("./api/signout");
const signinup_1 = require("./api/signinup");
const authorisationUrl_1 = require("./api/authorisationUrl");
const utils_2 = require("../../utils");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config, rIdToCore) {
        super(recipeId, appInfo, rIdToCore);
        this.getAPIsHandled = () => {
            return [
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(this, constants_1.SIGN_IN_UP_API),
                    id: constants_1.SIGN_IN_UP_API,
                    disabled: this.config.signInAndUpFeature.disableDefaultImplementation,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(this, constants_1.SIGN_OUT_API),
                    id: constants_1.SIGN_OUT_API,
                    disabled: this.config.signOutFeature.disableDefaultImplementation,
                },
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(this, constants_1.AUTHORISATION_API),
                    id: constants_1.AUTHORISATION_API,
                    disabled: this.config.signInAndUpFeature.disableDefaultImplementation,
                },
                ...this.emailVerificationRecipe.getAPIsHandled(),
            ];
        };
        this.handleAPIRequest = (id, req, res, next, path, method) =>
            __awaiter(this, void 0, void 0, function* () {
                if (id === constants_1.SIGN_IN_UP_API) {
                    return yield signinup_1.default(this, req, res, next);
                } else if (id === constants_1.SIGN_OUT_API) {
                    return yield signout_1.default(this, req, res, next);
                } else if (id === constants_1.AUTHORISATION_API) {
                    return yield authorisationUrl_1.default(this, req, res, next);
                } else {
                    return yield this.emailVerificationRecipe.handleAPIRequest(id, req, res, next, path, method);
                }
            });
        this.handleError = (err, request, response, next) => {
            if (err.type === error_1.default.NO_EMAIL_GIVEN_BY_PROVIDER) {
                return utils_2.send200Response(response, {
                    status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                });
            }
            return this.emailVerificationRecipe.handleError(err, request, response, next);
        };
        this.getAllCORSHeaders = () => {
            return [...this.emailVerificationRecipe.getAllCORSHeaders()];
        };
        this.isErrorFromThisOrChildRecipeBasedOnInstance = (err) => {
            return (
                error_1.default.isErrorFromSuperTokens(err) &&
                (this === err.recipe || this.emailVerificationRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err))
            );
        };
        this.getUserById = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUserById(this, userId);
            });
        this.getUserByThirdPartyInfo = (thirdPartyId, thirdPartyUserId) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUserByThirdPartyInfo(this, thirdPartyId, thirdPartyUserId);
            });
        this.getEmailForUserId = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                let userInfo = yield this.getUserById(userId);
                if (userInfo === undefined) {
                    throw new error_1.default(
                        {
                            type: error_1.default.UNKNOWN_USER_ID_ERROR,
                            message: "Unknown User ID provided",
                        },
                        this
                    );
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
                return this.emailVerificationRecipe.verifyEmailUsingToken(token);
            });
        this.isEmailVerified = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailVerificationRecipe.isEmailVerified(userId, yield this.getEmailForUserId(userId));
            });
        this.getUsersOldestFirst = (limit, nextPaginationToken) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUsers(this, "ASC", limit, nextPaginationToken);
            });
        this.getUsersNewestFirst = (limit, nextPaginationToken) =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUsers(this, "DESC", limit, nextPaginationToken);
            });
        this.getUserCount = () =>
            __awaiter(this, void 0, void 0, function* () {
                return coreAPICalls_1.getUsersCount(this);
            });
        this.signInUp = (thirdPartyId, thirdPartyUserId, email) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield coreAPICalls_1.signInUp(this, thirdPartyId, thirdPartyUserId, email);
            });
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        this.emailVerificationRecipe = new recipe_1.default(recipeId, appInfo, this.config.emailVerificationFeature);
        this.providers = this.config.signInAndUpFeature.providers;
    }
    static init(config) {
        return (appInfo) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, config);
                return Recipe.instance;
            } else {
                throw new error_1.default(
                    {
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error(
                            "ThirdParty recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    undefined
                );
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new error_1.default(
                {
                    type: error_1.default.GENERAL_ERROR,
                    payload: new Error("calling testing function in non testing env"),
                },
                undefined
            );
        }
        Recipe.instance = undefined;
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new error_1.default(
            {
                type: error_1.default.GENERAL_ERROR,
                payload: new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?"),
            },
            undefined
        );
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "thirdparty";
//# sourceMappingURL=recipe.js.map
