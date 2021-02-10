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
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config) {
        super(recipeId, appInfo);
        this.getAPIsHandled = () => {
            let apisHandled = [];
            for (let i = 0; i < this.providers.length; i++) {
                apisHandled.push(...this.providers[i].getAPIsHandled());
            }
            return apisHandled;
        };
        this.handleAPIRequest = (id, req, res, next) =>
            __awaiter(this, void 0, void 0, function* () {
                for (let i = 0; i < this.providers.length; i++) {
                    let apisHandled = this.providers[i].getAPIsHandled();
                    for (let j = 0; j < apisHandled.length; j++) {
                        if (id === apisHandled[j].id) {
                            return yield this.providers[i].handleAPIRequest(id, req, res, next);
                        }
                    }
                }
            });
        this.handleError = (err, request, response, next) => {
            return next(err);
        };
        this.getAllCORSHeaders = () => {
            return [];
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
                        this.getRecipeId()
                    );
                }
                return userInfo.thirdParty.email;
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
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        this.emailVerificationRecipe = new recipe_1.default(recipeId, appInfo, this.config.emailVerificationFeature);
        this.providers = this.config.signInAndUpFeature.providers.map((func) => {
            return func(this);
        });
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
                            "Emailverification recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    Recipe.RECIPE_ID
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
                Recipe.RECIPE_ID
            );
        }
        Recipe.instance = undefined;
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "thirdparty";
//# sourceMappingURL=recipe.js.map
