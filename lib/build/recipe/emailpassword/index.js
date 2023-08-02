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
exports.sendEmail = exports.sendResetPasswordEmail = exports.createResetPasswordLink = exports.updateEmailOrPassword = exports.consumePasswordResetToken = exports.createResetPasswordToken = exports.signIn = exports.signUp = exports.Error = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const constants_1 = require("../multitenancy/constants");
const utils_1 = require("./utils");
const __1 = require("../..");
class Wrapper {
    static signUp(tenantId, email, password, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
            email,
            password,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static signIn(tenantId, email, password, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signIn({
            email,
            password,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
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
    static createResetPasswordToken(tenantId, userId, email, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            email,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static consumePasswordResetToken(tenantId, token, newPassword, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.consumePasswordResetToken({
            token,
            newPassword,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static updateEmailOrPassword(input) {
        if (typeof input.recipeUserId === "string" && process.env.TEST_MODE === "testing") {
            // This is there cause for tests, we pass in a string in most tests.
            input.recipeUserId = new recipeUserId_1.default(input.recipeUserId);
        }
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updateEmailOrPassword(
            Object.assign(Object.assign({ userContext: {} }, input), {
                tenantIdForPasswordPolicy:
                    input.tenantIdForPasswordPolicy === undefined
                        ? constants_1.DEFAULT_TENANT_ID
                        : input.tenantIdForPasswordPolicy,
            })
        );
    }
    static createResetPasswordLink(tenantId, userId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let token = yield exports.createResetPasswordToken(tenantId, userId, userContext);
            if (token.status === "UNKNOWN_USER_ID_ERROR") {
                return token;
            }
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return {
                status: "OK",
                link: utils_1.getPasswordResetLink({
                    appInfo: recipeInstance.getAppInfo(),
                    recipeId: recipeInstance.getRecipeId(),
                    token: token.token,
                    tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                }),
            };
        });
    }
    static sendResetPasswordEmail(tenantId, userId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let link = yield exports.createResetPasswordLink(tenantId, userId, userContext);
            if (link.status === "UNKNOWN_USER_ID_ERROR") {
                return link;
            }
            const user = yield __1.getUser(userId, userContext);
            if (!user) {
                return { status: "UNKNOWN_USER_ID_ERROR" };
            }
            // TODO: what if there are multiple EP users linked
            const loginMethod = user.loginMethods.find((m) => m.recipeId === "emailpassword");
            if (!loginMethod) {
                return { status: "UNKNOWN_USER_ID_ERROR" };
            }
            yield exports.sendEmail({
                passwordResetLink: link.link,
                type: "PASSWORD_RESET",
                user: {
                    id: user.id,
                    recipeUserId: loginMethod.recipeUserId,
                    email: loginMethod.email,
                },
                tenantId,
                userContext,
            });
            return {
                status: "OK",
            };
        });
    }
    static sendEmail(input) {
        return __awaiter(this, void 0, void 0, function* () {
            let recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return yield recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail(
                Object.assign(Object.assign({ userContext: {} }, input), {
                    tenantId: input.tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : input.tenantId,
                })
            );
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
exports.createResetPasswordLink = Wrapper.createResetPasswordLink;
exports.sendResetPasswordEmail = Wrapper.sendResetPasswordEmail;
exports.sendEmail = Wrapper.sendEmail;
