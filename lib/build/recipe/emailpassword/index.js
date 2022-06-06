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
const recipe_1 = require("./recipe");
const error_1 = require("./error");
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
    static getUserById(userId, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({
            userId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static getUserByEmail(email, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserByEmail({
            email,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static createResetPasswordToken(userId, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static resetPasswordUsingToken(token, newPassword, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.resetPasswordUsingToken({
            token,
            newPassword,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static updateEmailOrPassword(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.updateEmailOrPassword(Object.assign({ userContext: {} }, input));
    }
    static createEmailVerificationToken(userId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.createEmailVerificationToken({
                userId,
                email: yield recipeInstance.getEmailForUserId(userId, userContext),
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static verifyEmailUsingToken(token, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let recipeInstance = recipe_1.default.getInstanceOrThrowError();
            let response = yield recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.verifyEmailUsingToken({
                token,
                userContext: userContext === undefined ? {} : userContext,
            });
            if (response.status === "OK") {
                return yield recipeInstance.recipeInterfaceImpl.getUserById({
                    userId: response.user.id,
                    userContext: userContext === undefined ? {} : userContext,
                });
            }
            return response;
        });
    }
    static isEmailVerified(userId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.isEmailVerified({
                userId,
                email: yield recipeInstance.getEmailForUserId(userId, userContext),
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static revokeEmailVerificationTokens(userId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return yield recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.revokeEmailVerificationTokens({
                userId,
                email: yield recipeInstance.getEmailForUserId(userId, userContext),
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static unverifyEmail(userId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return yield recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.unverifyEmail({
                userId,
                email: yield recipeInstance.getEmailForUserId(userId, userContext),
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static sendEmail(input) {
        return __awaiter(this, void 0, void 0, function* () {
            let recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return yield recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail(input);
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
exports.getUserById = Wrapper.getUserById;
exports.getUserByEmail = Wrapper.getUserByEmail;
exports.createResetPasswordToken = Wrapper.createResetPasswordToken;
exports.resetPasswordUsingToken = Wrapper.resetPasswordUsingToken;
exports.createEmailVerificationToken = Wrapper.createEmailVerificationToken;
exports.verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;
exports.isEmailVerified = Wrapper.isEmailVerified;
exports.revokeEmailVerificationTokens = Wrapper.revokeEmailVerificationTokens;
exports.unverifyEmail = Wrapper.unverifyEmail;
exports.updateEmailOrPassword = Wrapper.updateEmailOrPassword;
exports.sendEmail = Wrapper.sendEmail;
