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
exports.EmailVerificationClaim =
    exports.sendEmail =
    exports.unverifyEmail =
    exports.revokeEmailVerificationTokens =
    exports.isEmailVerified =
    exports.verifyEmailUsingToken =
    exports.sendEmailVerificationEmail =
    exports.createEmailVerificationLink =
    exports.createEmailVerificationToken =
    exports.Error =
    exports.init =
        void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const emailVerificationClaim_1 = require("./emailVerificationClaim");
const utils_1 = require("./utils");
const __1 = require("../..");
const utils_2 = require("../../utils");
class Wrapper {
    static async createEmailVerificationToken(tenantId, recipeUserId, email, userContext) {
        const ctx = (0, utils_2.getUserContext)(userContext);
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        if (email === undefined) {
            const emailInfo = await recipeInstance.getEmailForRecipeUserId(undefined, recipeUserId, ctx);
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
        return await recipeInstance.recipeInterfaceImpl.createEmailVerificationToken({
            recipeUserId,
            email: email,
            tenantId,
            userContext: ctx,
        });
    }
    static async createEmailVerificationLink(tenantId, recipeUserId, email, userContext) {
        const ctx = (0, utils_2.getUserContext)(userContext);
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        const appInfo = recipeInstance.getAppInfo();
        let emailVerificationToken = await (0, exports.createEmailVerificationToken)(
            tenantId,
            recipeUserId,
            email,
            ctx
        );
        if (emailVerificationToken.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            return {
                status: "EMAIL_ALREADY_VERIFIED_ERROR",
            };
        }
        return {
            status: "OK",
            link: (0, utils_1.getEmailVerifyLink)({
                appInfo,
                token: emailVerificationToken.token,
                tenantId,
                request: (0, __1.getRequestFromUserContext)(ctx),
                userContext: ctx,
            }),
        };
    }
    static async sendEmailVerificationEmail(tenantId, userId, recipeUserId, email, userContext) {
        const ctx = (0, utils_2.getUserContext)(userContext);
        if (email === undefined) {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            const emailInfo = await recipeInstance.getEmailForRecipeUserId(undefined, recipeUserId, ctx);
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
        let emailVerificationLink = await this.createEmailVerificationLink(tenantId, recipeUserId, email, ctx);
        if (emailVerificationLink.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            return {
                status: "EMAIL_ALREADY_VERIFIED_ERROR",
            };
        }
        await (0, exports.sendEmail)({
            type: "EMAIL_VERIFICATION",
            user: {
                id: userId,
                recipeUserId: recipeUserId,
                email: email,
            },
            emailVerifyLink: emailVerificationLink.link,
            tenantId,
            userContext: ctx,
        });
        return {
            status: "OK",
        };
    }
    static async verifyEmailUsingToken(tenantId, token, attemptAccountLinking = true, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.verifyEmailUsingToken({
            token,
            tenantId,
            attemptAccountLinking,
            userContext: (0, utils_2.getUserContext)(userContext),
        });
    }
    static async isEmailVerified(recipeUserId, email, userContext) {
        const ctx = (0, utils_2.getUserContext)(userContext);
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        if (email === undefined) {
            const emailInfo = await recipeInstance.getEmailForRecipeUserId(undefined, recipeUserId, ctx);
            if (emailInfo.status === "OK") {
                email = emailInfo.email;
            } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                return true;
            } else {
                throw new global.Error("Unknown User ID provided without email");
            }
        }
        return await recipeInstance.recipeInterfaceImpl.isEmailVerified({
            recipeUserId,
            email,
            userContext: ctx,
        });
    }
    static async revokeEmailVerificationTokens(tenantId, recipeUserId, email, userContext) {
        const ctx = (0, utils_2.getUserContext)(userContext);
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        // If the dev wants to delete the tokens for an old email address of the user they can pass the address
        // but redeeming those tokens would have no effect on isEmailVerified called without the old address
        // so in general that is not necessary either.
        if (email === undefined) {
            const emailInfo = await recipeInstance.getEmailForRecipeUserId(undefined, recipeUserId, ctx);
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
        return await recipeInstance.recipeInterfaceImpl.revokeEmailVerificationTokens({
            recipeUserId,
            email: email,
            tenantId,
            userContext: ctx,
        });
    }
    static async unverifyEmail(recipeUserId, email, userContext) {
        const ctx = (0, utils_2.getUserContext)(userContext);
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        if (email === undefined) {
            const emailInfo = await recipeInstance.getEmailForRecipeUserId(undefined, recipeUserId, ctx);
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
        return await recipeInstance.recipeInterfaceImpl.unverifyEmail({
            recipeUserId,
            email,
            userContext: ctx,
        });
    }
    static async sendEmail(input) {
        let recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return await recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail(
            Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
        );
    }
}
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
Wrapper.EmailVerificationClaim = emailVerificationClaim_1.EmailVerificationClaim;
exports.default = Wrapper;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.createEmailVerificationToken = Wrapper.createEmailVerificationToken;
exports.createEmailVerificationLink = Wrapper.createEmailVerificationLink;
exports.sendEmailVerificationEmail = Wrapper.sendEmailVerificationEmail;
exports.verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;
exports.isEmailVerified = Wrapper.isEmailVerified;
exports.revokeEmailVerificationTokens = Wrapper.revokeEmailVerificationTokens;
exports.unverifyEmail = Wrapper.unverifyEmail;
exports.sendEmail = Wrapper.sendEmail;
var emailVerificationClaim_2 = require("./emailVerificationClaim");
Object.defineProperty(exports, "EmailVerificationClaim", {
    enumerable: true,
    get: function () {
        return emailVerificationClaim_2.EmailVerificationClaim;
    },
});
