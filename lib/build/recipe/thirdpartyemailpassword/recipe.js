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
const utils_1 = require("../../utils");
const utils_2 = require("./utils");
const constants_1 = require("../emailpassword/constants");
const constants_2 = require("../thirdparty/constants");
const signup_1 = require("../emailpassword/api/signup");
const signin_1 = require("../emailpassword/api/signin");
const generatePasswordResetToken_1 = require("../emailpassword/api/generatePasswordResetToken");
const passwordReset_1 = require("../emailpassword/api/passwordReset");
const signout_1 = require("../emailpassword/api/signout");
const emailExists_1 = require("../emailpassword/api/emailExists");
const signinup_1 = require("../thirdparty/api/signinup");
const authorisationUrl_1 = require("../thirdparty/api/authorisationUrl");
const error_2 = require("../emailpassword/error");
const error_3 = require("../thirdparty/error");
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
        this.handleAPIRequest = (id, req, res, next) =>
            __awaiter(this, void 0, void 0, function* () {
                if (id === constants_1.SIGN_UP_API) {
                    return yield signup_1.default(this.emailPasswordRecipe, req, res, next);
                } else if (id === constants_1.SIGN_IN_API) {
                    return yield signin_1.default(this.emailPasswordRecipe, req, res, next);
                } else if (id === constants_1.GENERATE_PASSWORD_RESET_TOKEN_API) {
                    return yield generatePasswordResetToken_1.default(this.emailPasswordRecipe, req, res, next);
                } else if (id === constants_1.SIGN_OUT_API) {
                    return yield signout_1.default(this.emailPasswordRecipe, req, res, next);
                } else if (id === constants_1.PASSWORD_RESET_API) {
                    return yield passwordReset_1.default(this.emailPasswordRecipe, req, res, next);
                } else if (id === constants_1.SIGNUP_EMAIL_EXISTS_API) {
                    return yield emailExists_1.default(this.emailPasswordRecipe, req, res, next);
                }
                if (this.thirdPartyRecipe !== undefined && id === constants_2.SIGN_IN_UP_API) {
                    return yield signinup_1.default(this.thirdPartyRecipe, req, res, next);
                } else if (this.thirdPartyRecipe !== undefined && id === constants_2.AUTHORISATION_API) {
                    return yield authorisationUrl_1.default(this.thirdPartyRecipe, req, res, next);
                } else {
                    return yield this.emailVerificationRecipe.handleAPIRequest(id, req, res, next);
                }
            });
        this.handleError = (err, request, response, next) => {
            if (err.type === error_2.default.EMAIL_ALREADY_EXISTS_ERROR) {
                return this.handleError(
                    new error_2.default(
                        {
                            type: error_2.default.FIELD_ERROR,
                            payload: [
                                {
                                    id: "email",
                                    error: "This email already exists. Please sign in instead.",
                                },
                            ],
                            message: "Error in input formFields",
                        },
                        this
                    ),
                    request,
                    response,
                    next
                );
            } else if (err.type === error_2.default.WRONG_CREDENTIALS_ERROR) {
                return utils_1.send200Response(response, {
                    status: "WRONG_CREDENTIALS_ERROR",
                });
            } else if (err.type === error_2.default.FIELD_ERROR) {
                return utils_1.send200Response(response, {
                    status: "FIELD_ERROR",
                    formFields: err.payload,
                });
            } else if (err.type === error_2.default.RESET_PASSWORD_INVALID_TOKEN_ERROR) {
                return utils_1.send200Response(response, {
                    status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
                });
            } else if (err.type === error_3.default.NO_EMAIL_GIVEN_BY_PROVIDER) {
                return utils_1.send200Response(response, {
                    status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                });
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
                    nextPaginationTokens = utils_2.extractPaginationTokens(this, nextPaginationTokenString);
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
                return utils_2.combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, true);
            });
        this.getUsersNewestFirst = (limit, nextPaginationTokenString) =>
            __awaiter(this, void 0, void 0, function* () {
                limit = limit === undefined ? 100 : limit;
                let nextPaginationTokens = {
                    thirdPartyPaginationToken: undefined,
                    emailPasswordPaginationToken: undefined,
                };
                if (nextPaginationTokenString !== undefined) {
                    nextPaginationTokens = utils_2.extractPaginationTokens(this, nextPaginationTokenString);
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
                return utils_2.combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, false);
            });
        this.getUserCount = () =>
            __awaiter(this, void 0, void 0, function* () {
                let promise1 = this.emailPasswordRecipe.getUserCount();
                let promise2 = this.thirdPartyRecipe !== undefined ? this.thirdPartyRecipe.getUserCount() : 0;
                return (yield promise1) + (yield promise2);
            });
        this.config = utils_2.validateAndNormaliseUserInput(this, appInfo, config);
        this.emailPasswordRecipe = recipe_2.default.init({
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
        })(appInfo);
        this.thirdPartyRecipe = undefined;
        if (this.config.providers.length !== 0) {
            this.thirdPartyRecipe = recipe_3.default.init({
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
                                return yield this.config.signInFeature.handlePostSignIn(user, {
                                    loginType: "thirdparty",
                                    thirdPartyAuthCodeResponse,
                                });
                            } else {
                                return yield this.config.signUpFeature.handlePostSignUp(user, {
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
            })(appInfo);
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
