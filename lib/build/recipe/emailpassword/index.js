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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.linkEmailPasswordAccountsWithUserFromSession = exports.updateEmailOrPassword = exports.consumePasswordResetToken = exports.createResetPasswordToken = exports.signIn = exports.signUp = exports.Error = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const accountlinking_1 = require("../accountlinking");
class Wrapper {
    static signUp(email, password, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
            email,
            password,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static signIn(email, password, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signIn({
            email,
            password,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    /**
     * We do not make email optional here cause we want to
     * allow passing in primaryUserId. If we make email optional,
     * and if the user provides a primaryUserId, then it may result in two problems:
     *  - there is no recipeUserId = input primaryUserId, in this case,
     *    this function will throw an error
     *  - There is a recipe userId = input primaryUserId, but that recipe has no email,
     *    or has wrong email compared to what the user wanted to generate a reset token for.
     *
     * And we want to allow primaryUserId being passed in.
     */
    static createResetPasswordToken(userId, email, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            email,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static consumePasswordResetToken(token, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.consumePasswordResetToken({
            token,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static updateEmailOrPassword(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.updateEmailOrPassword(Object.assign({ userContext: {} }, input));
    }
    static sendEmail(input) {
        return __awaiter(this, void 0, void 0, function* () {
            let recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return yield recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail(
                Object.assign({ userContext: {} }, input)
            );
        });
    }
    /**
     * This function is similar to linkAccounts, but it specifically
     * works for when trying to link accounts with a user that you are already logged
     * into. This can be used to implement, for example, connecting social accounts to your *
     * existing email password account.
     *
     * This function also creates a new recipe user for the newUser if required.
     */
    static linkEmailPasswordAccountsWithUserFromSession(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            const createRecipeUserFunc = (userContext) =>
                __awaiter(this, void 0, void 0, function* () {
                    yield recipeInstance.recipeInterfaceImpl.createNewRecipeUser({
                        email: input.newUserEmail,
                        password: input.newUserPassword,
                        userContext,
                    });
                    // we ignore the result from the above cause after this, function returns,
                    // the linkAccountsWithUserFromSession anyway does recursion..
                });
            const verifyCredentialsFunc = (userContext) =>
                __awaiter(this, void 0, void 0, function* () {
                    const signInResult = yield recipeInstance.recipeInterfaceImpl.signIn({
                        email: input.newUserEmail,
                        password: input.newUserPassword,
                        userContext,
                    });
                    if (signInResult.status === "OK") {
                        return { status: "OK" };
                    } else {
                        return {
                            status: "CUSTOM_RESPONSE",
                            resp: signInResult,
                        };
                    }
                });
            return yield accountlinking_1.linkAccountsWithUserFromSession({
                session: input.session,
                newUser: {
                    recipeId: "emailpassword",
                    email: input.newUserEmail,
                },
                createRecipeUserFunc,
                verifyCredentialsFunc,
                userContext: input.userContext === undefined ? {} : input.userContext,
            });
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.signUp = Wrapper.signUp;
exports.signIn = Wrapper.signIn;
exports.createResetPasswordToken = Wrapper.createResetPasswordToken;
exports.consumePasswordResetToken = Wrapper.consumePasswordResetToken;
exports.updateEmailOrPassword = Wrapper.updateEmailOrPassword;
exports.linkEmailPasswordAccountsWithUserFromSession = Wrapper.linkEmailPasswordAccountsWithUserFromSession;
exports.sendEmail = Wrapper.sendEmail;
