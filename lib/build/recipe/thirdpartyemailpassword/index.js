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
exports.sendEmail = exports.sendResetPasswordEmail = exports.createResetPasswordLink = exports.updateEmailOrPassword = exports.resetPasswordUsingToken = exports.createResetPasswordToken = exports.getUsersByEmail = exports.getUserByThirdPartyInfo = exports.getUserById = exports.thirdPartyManuallyCreateOrUpdateUser = exports.thirdPartyGetProvider = exports.emailPasswordSignIn = exports.emailPasswordSignUp = exports.Error = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const constants_1 = require("../multitenancy/constants");
const utils_1 = require("../emailpassword/utils");
class Wrapper {
    static thirdPartyGetProvider(tenantId, thirdPartyId, clientType, userContext = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyGetProvider({
                thirdPartyId,
                clientType,
                tenantId,
                userContext,
            });
        });
    }
    static thirdPartyManuallyCreateOrUpdateUser(tenantId, thirdPartyId, thirdPartyUserId, email, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyManuallyCreateOrUpdateUser({
            thirdPartyId,
            thirdPartyUserId,
            email,
            tenantId,
            userContext,
        });
    }
    static getUserByThirdPartyInfo(tenantId, thirdPartyId, thirdPartyUserId, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserByThirdPartyInfo({
            thirdPartyId,
            thirdPartyUserId,
            tenantId,
            userContext,
        });
    }
    static emailPasswordSignUp(tenantId, email, password, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.emailPasswordSignUp({
            email,
            password,
            tenantId,
            userContext,
        });
    }
    static emailPasswordSignIn(tenantId, email, password, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.emailPasswordSignIn({
            email,
            password,
            tenantId,
            userContext,
        });
    }
    static getUserById(userId, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId, userContext });
    }
    static getUsersByEmail(tenantId, email, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUsersByEmail({
            email,
            tenantId,
            userContext,
        });
    }
    static createResetPasswordToken(tenantId, userId, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            tenantId,
            userContext,
        });
    }
    static resetPasswordUsingToken(tenantId, token, newPassword, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.resetPasswordUsingToken({
            token,
            newPassword,
            tenantId,
            userContext,
        });
    }
    static updateEmailOrPassword(input) {
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
            let token = yield exports.createResetPasswordToken(userId, tenantId, userContext);
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
                    tenantId,
                }),
            };
        });
    }
    static sendResetPasswordEmail(tenantId, userId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            let link = yield exports.createResetPasswordLink(userId, tenantId, userContext);
            if (link.status === "UNKNOWN_USER_ID_ERROR") {
                return link;
            }
            yield exports.sendEmail({
                passwordResetLink: link.link,
                type: "PASSWORD_RESET",
                user: yield exports.getUserById(userId, userContext),
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
            return yield recipe_1.default.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail(
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
exports.emailPasswordSignUp = Wrapper.emailPasswordSignUp;
exports.emailPasswordSignIn = Wrapper.emailPasswordSignIn;
exports.thirdPartyGetProvider = Wrapper.thirdPartyGetProvider;
exports.thirdPartyManuallyCreateOrUpdateUser = Wrapper.thirdPartyManuallyCreateOrUpdateUser;
exports.getUserById = Wrapper.getUserById;
exports.getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo;
exports.getUsersByEmail = Wrapper.getUsersByEmail;
exports.createResetPasswordToken = Wrapper.createResetPasswordToken;
exports.resetPasswordUsingToken = Wrapper.resetPasswordUsingToken;
exports.updateEmailOrPassword = Wrapper.updateEmailOrPassword;
exports.createResetPasswordLink = Wrapper.createResetPasswordLink;
exports.sendResetPasswordEmail = Wrapper.sendResetPasswordEmail;
exports.sendEmail = Wrapper.sendEmail;
