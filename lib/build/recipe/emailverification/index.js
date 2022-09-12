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
const emailVerificationClaim_1 = require("./emailVerificationClaim");
class Wrapper {
    static createEmailVerificationToken(userId, email, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            if (email === undefined) {
                const emailInfo = yield recipeInstance.getEmailForUserId(userId, userContext);
                if (emailInfo.status === "OK") {
                    email = emailInfo.email;
                } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                    return {
                        status: "EMAIL_ALREADY_VERIFIED_ERROR",
                    };
                } else {
                    throw new global.Error("Unknown User ID provided without email");
                }
            }
            return yield recipeInstance.recipeInterfaceImpl.createEmailVerificationToken({
                userId,
                email: email,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static verifyEmailUsingToken(token, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.verifyEmailUsingToken({
                token,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static isEmailVerified(userId, email, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            if (email === undefined) {
                const emailInfo = yield recipeInstance.getEmailForUserId(userId, userContext);
                if (emailInfo.status === "OK") {
                    email = emailInfo.email;
                } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                    return true;
                } else {
                    throw new global.Error("Unknown User ID provided without email");
                }
            }
            return yield recipeInstance.recipeInterfaceImpl.isEmailVerified({
                userId,
                email: email,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static revokeEmailVerificationTokens(userId, email, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            // If the dev wants to delete the tokens for an old email address of the user they can pass the address
            // but redeeming those tokens would have no effect on isEmailVerified called without the old address
            // so in general that is not necessary either.
            if (email === undefined) {
                const emailInfo = yield recipeInstance.getEmailForUserId(userId, userContext);
                if (emailInfo.status === "OK") {
                    email = emailInfo.email;
                } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                    // This only happens for phone based passwordless users (or if the user added a custom getEmailForUserId)
                    // We can return OK here, since there is no way to create an email verification token
                    // if getEmailForUserId returns EMAIL_DOES_NOT_EXIST_ERROR.
                    return {
                        status: "OK",
                    };
                } else {
                    throw new global.Error("Unknown User ID provided without email");
                }
            }
            return yield recipeInstance.recipeInterfaceImpl.revokeEmailVerificationTokens({
                userId,
                email: email,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static unverifyEmail(userId, email, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            if (email === undefined) {
                const emailInfo = yield recipeInstance.getEmailForUserId(userId, userContext);
                if (emailInfo.status === "OK") {
                    email = emailInfo.email;
                } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                    // Here we are returning OK since that's how it used to work, but a later call to isVerified will still return true
                    return {
                        status: "OK",
                    };
                } else {
                    throw new global.Error("Unknown User ID provided without email");
                }
            }
            return yield recipeInstance.recipeInterfaceImpl.unverifyEmail({
                userId,
                email: email,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static sendEmail(input) {
        return __awaiter(this, void 0, void 0, function* () {
            let recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return yield recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail(
                Object.assign({ userContext: {} }, input)
            );
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
Wrapper.EmailVerificationClaim = emailVerificationClaim_1.EmailVerificationClaim;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.createEmailVerificationToken = Wrapper.createEmailVerificationToken;
exports.verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;
exports.isEmailVerified = Wrapper.isEmailVerified;
exports.revokeEmailVerificationTokens = Wrapper.revokeEmailVerificationTokens;
exports.unverifyEmail = Wrapper.unverifyEmail;
exports.sendEmail = Wrapper.sendEmail;
var emailVerificationClaim_2 = require("./emailVerificationClaim");
exports.EmailVerificationClaim = emailVerificationClaim_2.EmailVerificationClaim;
