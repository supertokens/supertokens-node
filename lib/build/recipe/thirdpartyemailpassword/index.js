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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.sendResetPasswordEmail = exports.createResetPasswordLink = exports.updateEmailOrPassword = exports.consumePasswordResetToken = exports.resetPasswordUsingToken = exports.createResetPasswordToken = exports.thirdPartyManuallyCreateOrUpdateUser = exports.thirdPartyGetProvider = exports.emailPasswordSignIn = exports.emailPasswordSignUp = exports.Error = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const constants_1 = require("../multitenancy/constants");
const utils_1 = require("../emailpassword/utils");
const __1 = require("../..");
class Wrapper {
    static async thirdPartyGetProvider(tenantId, thirdPartyId, clientType, userContext = {}) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyGetProvider({
            thirdPartyId,
            clientType,
            tenantId,
            userContext,
        });
    }
    static thirdPartyManuallyCreateOrUpdateUser(
        tenantId,
        thirdPartyId,
        thirdPartyUserId,
        email,
        isVerified,
        userContext = {}
    ) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyManuallyCreateOrUpdateUser({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
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
    static createResetPasswordToken(tenantId, userId, email, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            email,
            tenantId,
            userContext,
        });
    }
    static async resetPasswordUsingToken(tenantId, token, newPassword, userContext) {
        const consumeResp = await Wrapper.consumePasswordResetToken(tenantId, token, userContext);
        if (consumeResp.status !== "OK") {
            return consumeResp;
        }
        let result = await Wrapper.updateEmailOrPassword({
            recipeUserId: new recipeUserId_1.default(consumeResp.userId),
            email: consumeResp.email,
            password: newPassword,
            tenantIdForPasswordPolicy: tenantId,
            userContext,
        });
        if (result.status === "EMAIL_ALREADY_EXISTS_ERROR" || result.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
            throw new global.Error("Should never come here cause we are not updating email");
        }
        if (result.status === "PASSWORD_POLICY_VIOLATED_ERROR") {
            return {
                status: "PASSWORD_POLICY_VIOLATED_ERROR",
                failureReason: result.failureReason,
            };
        }
        return {
            status: result.status,
        };
    }
    static consumePasswordResetToken(tenantId, token, userContext = {}) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.consumePasswordResetToken({
            token,
            tenantId,
            userContext,
        });
    }
    static updateEmailOrPassword(input) {
        var _a;
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.updateEmailOrPassword(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
                tenantIdForPasswordPolicy:
                    input.tenantIdForPasswordPolicy === undefined
                        ? constants_1.DEFAULT_TENANT_ID
                        : input.tenantIdForPasswordPolicy,
            })
        );
    }
    static async createResetPasswordLink(tenantId, userId, email, userContext = {}) {
        let token = await exports.createResetPasswordToken(tenantId, userId, email, userContext);
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
                request: __1.getRequestFromUserContext(userContext),
                userContext,
            }),
        };
    }
    static async sendResetPasswordEmail(tenantId, userId, email, userContext = {}) {
        const user = await __1.getUser(userId, userContext);
        if (!user) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }
        const loginMethod = user.loginMethods.find((m) => m.recipeId === "emailpassword" && m.hasSameEmailAs(email));
        if (!loginMethod) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }
        let link = await exports.createResetPasswordLink(tenantId, userId, email, userContext);
        if (link.status === "UNKNOWN_USER_ID_ERROR") {
            return link;
        }
        await exports.sendEmail({
            passwordResetLink: link.link,
            type: "PASSWORD_RESET",
            user: {
                email: loginMethod.email,
                id: user.id,
                recipeUserId: loginMethod.recipeUserId,
            },
            tenantId,
            userContext,
        });
        return {
            status: "OK",
        };
    }
    static async sendEmail(input) {
        var _a;
        return await recipe_1.default.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail(
            Object.assign(Object.assign({}, input), {
                userContext: (_a = input.userContext) !== null && _a !== void 0 ? _a : {},
                tenantId: input.tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : input.tenantId,
            })
        );
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
exports.createResetPasswordToken = Wrapper.createResetPasswordToken;
exports.resetPasswordUsingToken = Wrapper.resetPasswordUsingToken;
exports.consumePasswordResetToken = Wrapper.consumePasswordResetToken;
exports.updateEmailOrPassword = Wrapper.updateEmailOrPassword;
exports.createResetPasswordLink = Wrapper.createResetPasswordLink;
exports.sendResetPasswordEmail = Wrapper.sendResetPasswordEmail;
exports.sendEmail = Wrapper.sendEmail;
