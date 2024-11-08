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
exports.sendEmail = exports.sendRecoverAccountEmail = exports.createRecoverAccountLink = exports.registerCredential = exports.consumeRecoverAccountToken = exports.recoverAccount = exports.generateRecoverAccountToken = exports.verifyCredentials = exports.signIn = exports.signInOptions = exports.registerOptions = exports.Error = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const constants_1 = require("../multitenancy/constants");
const utils_1 = require("./utils");
const __1 = require("../..");
const utils_2 = require("../../utils");
const constants_2 = require("./constants");
class Wrapper {
    static async registerOptions(
        email,
        recoverAccountToken,
        relyingPartyId,
        relyingPartyName,
        origin,
        timeout,
        attestation = "none",
        tenantId,
        userContext
    ) {
        let payload = email ? { email } : recoverAccountToken ? { recoverAccountToken } : null;
        if (!payload) {
            return { status: "INVALID_EMAIL_ERROR", err: "Email is missing" };
        }
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.registerOptions(
            Object.assign(
                Object.assign(
                    {
                        requireResidentKey: constants_2.DEFAULT_REGISTER_OPTIONS_REQUIRE_RESIDENT_KEY,
                        residentKey: constants_2.DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY,
                        userVerification: constants_2.DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION,
                        supportedAlgorithmIds: constants_2.DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS,
                    },
                    payload
                ),
                {
                    relyingPartyId,
                    relyingPartyName,
                    origin,
                    timeout,
                    attestation,
                    tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                    userContext: utils_2.getUserContext(userContext),
                }
            )
        );
    }
    static signInOptions(relyingPartyId, origin, timeout, tenantId, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signInOptions({
            userVerification: constants_2.DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION,
            relyingPartyId,
            origin,
            timeout,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            userContext: utils_2.getUserContext(userContext),
        });
    }
    static signIn(tenantId, webauthnGeneratedOptionsId, credential, session, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signIn({
            webauthnGeneratedOptionsId,
            credential,
            session,
            shouldTryLinkingWithSessionUser: !!session,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            userContext: utils_2.getUserContext(userContext),
        });
    }
    static async verifyCredentials(tenantId, webauthnGeneratedOptionsId, credential, userContext) {
        const resp = await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.verifyCredentials({
            webauthnGeneratedOptionsId,
            credential,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            userContext: utils_2.getUserContext(userContext),
        });
        // Here we intentionally skip the user and recipeUserId props, because we do not want apps to accidentally use this to sign in
        return {
            status: resp.status,
        };
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
    static generateRecoverAccountToken(tenantId, userId, email, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.generateRecoverAccountToken({
            userId,
            email,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            userContext: utils_2.getUserContext(userContext),
        });
    }
    static async recoverAccount(tenantId, webauthnGeneratedOptionsId, token, credential, userContext) {
        const consumeResp = await Wrapper.consumeRecoverAccountToken(tenantId, token, userContext);
        if (consumeResp.status !== "OK") {
            return consumeResp;
        }
        let result = await Wrapper.registerCredential({
            recipeUserId: new recipeUserId_1.default(consumeResp.userId),
            webauthnGeneratedOptionsId,
            credential,
            tenantId,
            userContext,
        });
        if (result.status === "INVALID_AUTHENTICATOR_ERROR") {
            return {
                status: "INVALID_AUTHENTICATOR_ERROR",
                failureReason: result.reason,
            };
        }
        return {
            status: result.status,
        };
    }
    static consumeRecoverAccountToken(tenantId, token, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.consumeRecoverAccountToken({
            token,
            tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
            userContext: utils_2.getUserContext(userContext),
        });
    }
    static registerCredential(input) {
        return recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.registerCredential(
                Object.assign(Object.assign({}, input), { userContext: utils_2.getUserContext(input.userContext) })
            );
    }
    static async createRecoverAccountLink(tenantId, userId, email, userContext) {
        const ctx = utils_2.getUserContext(userContext);
        let token = await this.generateRecoverAccountToken(tenantId, userId, email, ctx);
        if (token.status === "UNKNOWN_USER_ID_ERROR") {
            return token;
        }
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return {
            status: "OK",
            link: utils_1.getRecoverAccountLink({
                appInfo: recipeInstance.getAppInfo(),
                token: token.token,
                tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                request: __1.getRequestFromUserContext(ctx),
                userContext: ctx,
            }),
        };
    }
    static async sendRecoverAccountEmail(tenantId, userId, email, userContext) {
        const user = await __1.getUser(userId, userContext);
        if (!user) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }
        const loginMethod = user.loginMethods.find((m) => m.recipeId === "webauthn" && m.hasSameEmailAs(email));
        if (!loginMethod) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }
        let link = await this.createRecoverAccountLink(tenantId, userId, email, userContext);
        if (link.status === "UNKNOWN_USER_ID_ERROR") {
            return link;
        }
        await exports.sendEmail({
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
            Object.assign(Object.assign({}, input), {
                tenantId: input.tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : input.tenantId,
                userContext: utils_2.getUserContext(input.userContext),
            })
        );
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.Error = error_1.default;
exports.init = Wrapper.init;
exports.Error = Wrapper.Error;
exports.registerOptions = Wrapper.registerOptions;
exports.signInOptions = Wrapper.signInOptions;
exports.signIn = Wrapper.signIn;
exports.verifyCredentials = Wrapper.verifyCredentials;
exports.generateRecoverAccountToken = Wrapper.generateRecoverAccountToken;
exports.recoverAccount = Wrapper.recoverAccount;
exports.consumeRecoverAccountToken = Wrapper.consumeRecoverAccountToken;
exports.registerCredential = Wrapper.registerCredential;
exports.createRecoverAccountLink = Wrapper.createRecoverAccountLink;
exports.sendRecoverAccountEmail = Wrapper.sendRecoverAccountEmail;
exports.sendEmail = Wrapper.sendEmail;
