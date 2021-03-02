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
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, config) {
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
            if (this.emailPasswordRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err)) {
                return this.emailPasswordRecipe.handleError(err, request, response, next);
            } else if (
                this.thirdPartyRecipe !== undefined &&
                this.thirdPartyRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err)
            ) {
                return this.thirdPartyRecipe.handleError(err, request, response, next);
            }
            return this.emailVerificationRecipe.handleError(err, request, response, next);
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
        this.isErrorFromThisOrChildRecipeBasedOnInstance = (err) => {
            return (
                error_1.default.isErrorFromSuperTokens(err) &&
                (this === err.recipe ||
                    this.emailVerificationRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err) ||
                    this.emailPasswordRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err) ||
                    (this.thirdPartyRecipe !== undefined &&
                        this.thirdPartyRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err)))
            );
        };
        this.signUp = (email, password) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordRecipe.signUp(email, password);
            });
        this.signIn = (email, password) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordRecipe.signIn(email, password);
            });
        this.signInUp = (thirdPartyId, thirdPartyUserId, email) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.thirdPartyRecipe === undefined) {
                    throw new error_1.default(
                        {
                            type: error_1.default.GENERAL_ERROR,
                            payload: new Error("No thirdparty provider configured"),
                        },
                        this
                    );
                }
                return this.thirdPartyRecipe.signInUp(thirdPartyId, thirdPartyUserId, email);
            });
        this.getUserById = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield this.emailPasswordRecipe.getUserById(userId);
                if (user !== undefined) {
                    return user;
                }
                if (this.thirdPartyRecipe === undefined) {
                    return undefined;
                }
                return yield this.thirdPartyRecipe.getUserById(userId);
            });
        this.getUserByThirdPartyInfo = (thirdPartyId, thirdPartyUserId) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.thirdPartyRecipe === undefined) {
                    return undefined;
                }
                return this.thirdPartyRecipe.getUserByThirdPartyInfo(thirdPartyId, thirdPartyUserId);
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
        this.getUserByEmail = (email) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordRecipe.getUserByEmail(email);
            });
        this.createResetPasswordToken = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordRecipe.createResetPasswordToken(userId);
            });
        this.resetPasswordUsingToken = (token, newPassword) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordRecipe.resetPasswordUsingToken(token, newPassword);
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
        this.getUsersOldestFirst = (limit, nextPaginationTokenString) =>
            __awaiter(this, void 0, void 0, function* () {
                limit = limit === undefined ? 100 : limit;
                let nextPaginationTokens = {
                    thirdPartyPaginationToken: undefined,
                    emailPasswordPaginationToken: undefined,
                };
                if (nextPaginationTokenString !== undefined) {
                    nextPaginationTokens = utils_1.extractPaginationTokens(this, nextPaginationTokenString);
                }
                let emailPasswordResultPromise = this.emailPasswordRecipe.getUsersOldestFirst(
                    limit,
                    nextPaginationTokens.emailPasswordPaginationToken
                );
                let thirdPartyResultPromise =
                    this.thirdPartyRecipe === undefined
                        ? {
                              users: [],
                          }
                        : this.thirdPartyRecipe.getUsersOldestFirst(
                              limit,
                              nextPaginationTokens.thirdPartyPaginationToken
                          );
                let emailPasswordResult = yield emailPasswordResultPromise;
                let thirdPartyResult = yield thirdPartyResultPromise;
                return utils_1.combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, true);
            });
        this.getUsersNewestFirst = (limit, nextPaginationTokenString) =>
            __awaiter(this, void 0, void 0, function* () {
                limit = limit === undefined ? 100 : limit;
                let nextPaginationTokens = {
                    thirdPartyPaginationToken: undefined,
                    emailPasswordPaginationToken: undefined,
                };
                if (nextPaginationTokenString !== undefined) {
                    nextPaginationTokens = utils_1.extractPaginationTokens(this, nextPaginationTokenString);
                }
                let emailPasswordResultPromise = this.emailPasswordRecipe.getUsersNewestFirst(
                    limit,
                    nextPaginationTokens.emailPasswordPaginationToken
                );
                let thirdPartyResultPromise =
                    this.thirdPartyRecipe === undefined
                        ? {
                              users: [],
                          }
                        : this.thirdPartyRecipe.getUsersNewestFirst(
                              limit,
                              nextPaginationTokens.thirdPartyPaginationToken
                          );
                let emailPasswordResult = yield emailPasswordResultPromise;
                let thirdPartyResult = yield thirdPartyResultPromise;
                return utils_1.combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, false);
            });
        this.getUserCount = () =>
            __awaiter(this, void 0, void 0, function* () {
                let promise1 = this.emailPasswordRecipe.getUserCount();
                let promise2 = this.thirdPartyRecipe !== undefined ? this.thirdPartyRecipe.getUserCount() : 0;
                return (yield promise1) + (yield promise2);
            });
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        this.emailPasswordRecipe = new recipe_2.default(
            recipeId,
            appInfo,
            {
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
                    disableDefaultImplementation: this.config.signUpFeature.disableDefaultImplementation,
                    formFields: this.config.signUpFeature.formFields,
                    handleCustomFormFieldsPostSignUp: (user, formfields) =>
                        __awaiter(this, void 0, void 0, function* () {
                            return yield this.config.signUpFeature.handlePostSignUp(user, {
                                loginType: "emailpassword",
                                formFields: formfields,
                            });
                        }),
                },
                signInFeature: {
                    disableDefaultImplementation: this.config.signInFeature.disableDefaultImplementation,
                },
                signOutFeature: {
                    disableDefaultImplementation: this.config.signOutFeature.disableDefaultImplementation,
                },
                resetPasswordUsingTokenFeature: this.config.resetPasswordUsingTokenFeature,
                emailVerificationFeature: {
                    disableDefaultImplementation: true,
                },
            },
            recipe_2.default.RECIPE_ID
        );
        if (this.config.providers.length !== 0) {
            this.thirdPartyRecipe = new recipe_3.default(
                recipeId,
                appInfo,
                {
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
                        disableDefaultImplementation:
                            this.config.signInFeature.disableDefaultImplementation ||
                            this.config.signUpFeature.disableDefaultImplementation,
                        providers: this.config.providers,
                        handlePostSignUpIn: (user, thirdPartyAuthCodeResponse, newUser) =>
                            __awaiter(this, void 0, void 0, function* () {
                                if (newUser) {
                                    return yield this.config.signUpFeature.handlePostSignUp(user, {
                                        loginType: "thirdparty",
                                        thirdPartyAuthCodeResponse,
                                    });
                                } else {
                                    return yield this.config.signInFeature.handlePostSignIn(user, {
                                        loginType: "thirdparty",
                                        thirdPartyAuthCodeResponse,
                                    });
                                }
                            }),
                    },
                    signOutFeature: {
                        disableDefaultImplementation: true,
                    },
                    emailVerificationFeature: {
                        disableDefaultImplementation: true,
                    },
                },
                recipe_3.default.RECIPE_ID
            );
        }
        this.emailVerificationRecipe = new recipe_1.default(recipeId, appInfo, this.config.emailVerificationFeature);
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
                            "ThirdPartyEmailPassword recipe has already been initialised. Please check your code for bugs."
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
Recipe.RECIPE_ID = "thirdpartyemailpassword";
//# sourceMappingURL=recipe.js.map
