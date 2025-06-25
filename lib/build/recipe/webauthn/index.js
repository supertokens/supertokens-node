"use strict";
/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
exports.updateUserEmail =
    exports.listCredentials =
    exports.getCredential =
    exports.removeCredential =
    exports.removeGeneratedOptions =
    exports.getUserFromRecoverAccountToken =
    exports.getGeneratedOptions =
    exports.sendEmail =
    exports.sendRecoverAccountEmail =
    exports.createRecoverAccountLink =
    exports.registerCredential =
    exports.consumeRecoverAccountToken =
    exports.recoverAccount =
    exports.generateRecoverAccountToken =
    exports.verifyCredentials =
    exports.signUp =
    exports.signIn =
    exports.signInOptions =
    exports.registerOptions =
    exports.Error =
    exports.init =
        void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const constants_1 = require("../multitenancy/constants");
const utils_1 = require("./utils");
const __1 = require("../..");
const utils_2 = require("../../utils");
class Wrapper {
    static async registerOptions(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.registerOptions(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static async signInOptions(input) {
        return await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.signInOptions(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static getGeneratedOptions(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getGeneratedOptions(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static signUp(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.signUp(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static signIn(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.signIn(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static async verifyCredentials(input) {
        const resp = await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.verifyCredentials(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
        // Here we intentionally skip the user and recipeUserId props, because we do not want apps to accidentally use this to sign in
        return {
            status: resp.status,
        };
    }
    /**
     * We do not make email optional here because we want to
     * allow passing in primaryUserId. If we make email optional,
     * and if the user provides a primaryUserId, then it may result in two problems:
     *  - there is no recipeUserId = input primaryUserId, in this case,
     *    this function will throw an error
     *  - There is a recipe userId = input primaryUserId, but that recipe has no email,
     *    or has wrong email compared to what the user wanted to generate a reset token for.
     *
     * And we want to allow primaryUserId being passed in.
     */
    static generateRecoverAccountToken(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.generateRecoverAccountToken(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static async recoverAccount({
        tenantId = constants_1.DEFAULT_TENANT_ID,
        webauthnGeneratedOptionsId,
        token,
        credential,
        userContext,
    }) {
        const consumeResp = await Wrapper.consumeRecoverAccountToken({ tenantId, token, userContext });
        if (consumeResp.status !== "OK") {
            return consumeResp;
        }
        let result = await Wrapper.registerCredential({
            recipeUserId: consumeResp.userId,
            webauthnGeneratedOptionsId,
            credential,
            userContext,
        });
        return result;
    }
    static consumeRecoverAccountToken(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.consumeRecoverAccountToken(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static registerCredential(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.registerCredential(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static async createRecoverAccountLink({ tenantId, userId, email, userContext }) {
        const token = await this.generateRecoverAccountToken({ tenantId, userId, email, userContext });
        if (token.status === "UNKNOWN_USER_ID_ERROR") {
            return token;
        }
        const ctx = (0, utils_2.getUserContext)(userContext);
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return {
            status: "OK",
            link: (0, utils_1.getRecoverAccountLink)({
                appInfo: recipeInstance.getAppInfo(),
                token: token.token,
                tenantId,
                request: (0, __1.getRequestFromUserContext)(ctx),
                userContext: ctx,
            }),
        };
    }
    static async sendRecoverAccountEmail({ tenantId, userId, email, userContext }) {
        const user = await (0, __1.getUser)(userId, userContext);
        if (!user) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }
        const loginMethod = user.loginMethods.find((m) => m.recipeId === "webauthn" && m.hasSameEmailAs(email));
        if (!loginMethod) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }
        let link = await this.createRecoverAccountLink({ tenantId, userId, email, userContext });
        if (link.status !== "OK") return link;
        await (0, exports.sendEmail)({
            recoverAccountLink: link.link,
            type: "RECOVER_ACCOUNT",
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
    }
    static async sendEmail(input) {
        let recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return await recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail(
            Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
        );
    }
    static async getUserFromRecoverAccountToken(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getUserFromRecoverAccountToken(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static async removeGeneratedOptions(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.removeGeneratedOptions(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static async removeCredential(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.removeCredential(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static async getCredential(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getCredential(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static async listCredentials(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.listCredentials(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
    static async updateUserEmail(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.updateUserEmail(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_2.getUserContext)(input.userContext) })
            );
    }
}
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
exports.default = Wrapper;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.registerOptions = Wrapper.registerOptions;
exports.signInOptions = Wrapper.signInOptions;
exports.signIn = Wrapper.signIn;
exports.signUp = Wrapper.signUp;
exports.verifyCredentials = Wrapper.verifyCredentials;
exports.generateRecoverAccountToken = Wrapper.generateRecoverAccountToken;
exports.recoverAccount = Wrapper.recoverAccount;
exports.consumeRecoverAccountToken = Wrapper.consumeRecoverAccountToken;
exports.registerCredential = Wrapper.registerCredential;
exports.createRecoverAccountLink = Wrapper.createRecoverAccountLink;
exports.sendRecoverAccountEmail = Wrapper.sendRecoverAccountEmail;
exports.sendEmail = Wrapper.sendEmail;
exports.getGeneratedOptions = Wrapper.getGeneratedOptions;
exports.getUserFromRecoverAccountToken = Wrapper.getUserFromRecoverAccountToken;
exports.removeGeneratedOptions = Wrapper.removeGeneratedOptions;
exports.removeCredential = Wrapper.removeCredential;
exports.getCredential = Wrapper.getCredential;
exports.listCredentials = Wrapper.listCredentials;
exports.updateUserEmail = Wrapper.updateUserEmail;
