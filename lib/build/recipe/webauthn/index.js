"use strict";
/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeneratedOptions = exports.sendEmail = exports.sendRecoverAccountEmail = exports.createRecoverAccountLink = exports.registerCredential = exports.consumeRecoverAccountToken = exports.recoverAccount = exports.generateRecoverAccountToken = exports.verifyCredentials = exports.signIn = exports.signInOptions = exports.registerOptions = exports.Error = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = __importDefault(require("./error"));
const constants_1 = require("../multitenancy/constants");
const utils_1 = require("./utils");
const __1 = require("../..");
const utils_2 = require("../../utils");
const constants_2 = require("./constants");
class Wrapper {
    static async registerOptions(_a) {
        var {
                residentKey = constants_2.DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY,
                userVerification = constants_2.DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION,
                userPresence = constants_2.DEFAULT_REGISTER_OPTIONS_USER_PRESENCE,
                attestation = constants_2.DEFAULT_REGISTER_OPTIONS_ATTESTATION,
                supportedAlgorithmIds = constants_2.DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS,
                timeout = constants_2.DEFAULT_REGISTER_OPTIONS_TIMEOUT,
                tenantId = constants_1.DEFAULT_TENANT_ID,
                userContext,
            } = _a,
            rest = __rest(_a, [
                "residentKey",
                "userVerification",
                "userPresence",
                "attestation",
                "supportedAlgorithmIds",
                "timeout",
                "tenantId",
                "userContext",
            ]);
        let emailOrRecoverAccountToken;
        if ("email" in rest || "recoverAccountToken" in rest) {
            if ("email" in rest) {
                emailOrRecoverAccountToken = { email: rest.email };
            } else {
                emailOrRecoverAccountToken = { recoverAccountToken: rest.recoverAccountToken };
            }
        } else {
            return { status: "INVALID_EMAIL_ERROR", err: "Email is missing" };
        }
        let relyingPartyId;
        let relyingPartyName;
        let origin;
        if ("request" in rest) {
            origin =
                rest.origin ||
                (await recipe_1.default.getInstanceOrThrowError().config.getOrigin({
                    request: rest.request,
                    tenantId: tenantId,
                    userContext: utils_2.getUserContext(userContext),
                }));
            relyingPartyId =
                rest.relyingPartyId ||
                (await recipe_1.default.getInstanceOrThrowError().config.getRelyingPartyId({
                    request: rest.request,
                    tenantId: tenantId,
                    userContext: utils_2.getUserContext(userContext),
                }));
            relyingPartyName =
                rest.relyingPartyName ||
                (await recipe_1.default.getInstanceOrThrowError().config.getRelyingPartyName({
                    tenantId: tenantId,
                    userContext: utils_2.getUserContext(userContext),
                }));
        } else {
            if (!rest.origin) {
                throw new exports.Error({ type: "BAD_INPUT_ERROR", message: "Origin missing from the input" });
            }
            if (!rest.relyingPartyId) {
                throw new exports.Error({ type: "BAD_INPUT_ERROR", message: "RelyingPartyId missing from the input" });
            }
            if (!rest.relyingPartyName) {
                throw new exports.Error({
                    type: "BAD_INPUT_ERROR",
                    message: "RelyingPartyName missing from the input",
                });
            }
            origin = rest.origin;
            relyingPartyId = rest.relyingPartyId;
            relyingPartyName = rest.relyingPartyName;
        }
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.registerOptions(
            Object.assign(Object.assign({}, emailOrRecoverAccountToken), {
                residentKey,
                userVerification,
                userPresence,
                supportedAlgorithmIds,
                relyingPartyId,
                relyingPartyName,
                origin,
                timeout,
                attestation,
                tenantId,
                userContext: utils_2.getUserContext(userContext),
            })
        );
    }
    static async signInOptions(_a) {
        var {
                tenantId = constants_1.DEFAULT_TENANT_ID,
                userVerification = constants_2.DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION,
                userPresence = constants_2.DEFAULT_SIGNIN_OPTIONS_USER_PRESENCE,
                timeout = constants_2.DEFAULT_SIGNIN_OPTIONS_TIMEOUT,
                userContext,
            } = _a,
            rest = __rest(_a, ["tenantId", "userVerification", "userPresence", "timeout", "userContext"]);
        let origin;
        let relyingPartyId;
        let relyingPartyName;
        if ("request" in rest) {
            relyingPartyId =
                rest.relyingPartyId ||
                (await recipe_1.default.getInstanceOrThrowError().config.getRelyingPartyId({
                    request: rest.request,
                    tenantId: tenantId,
                    userContext: utils_2.getUserContext(userContext),
                }));
            relyingPartyName =
                rest.relyingPartyName ||
                (await recipe_1.default.getInstanceOrThrowError().config.getRelyingPartyName({
                    tenantId: tenantId,
                    userContext: utils_2.getUserContext(userContext),
                }));
            origin =
                rest.origin ||
                (await recipe_1.default.getInstanceOrThrowError().config.getOrigin({
                    request: rest.request,
                    tenantId: tenantId,
                    userContext: utils_2.getUserContext(userContext),
                }));
        } else {
            if (!rest.relyingPartyId) {
                throw new exports.Error({ type: "BAD_INPUT_ERROR", message: "RelyingPartyId missing from the input" });
            }
            if (!rest.relyingPartyName) {
                throw new exports.Error({
                    type: "BAD_INPUT_ERROR",
                    message: "RelyingPartyName missing from the input",
                });
            }
            if (!rest.origin) {
                throw new exports.Error({ type: "BAD_INPUT_ERROR", message: "Origin missing from the input" });
            }
            relyingPartyId = rest.relyingPartyId;
            relyingPartyName = rest.relyingPartyName;
            origin = rest.origin;
        }
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signInOptions({
            relyingPartyId,
            relyingPartyName,
            origin,
            timeout,
            tenantId,
            userVerification,
            userPresence,
            userContext: utils_2.getUserContext(userContext),
        });
    }
    static getGeneratedOptions({ webauthnGeneratedOptionsId, tenantId = constants_1.DEFAULT_TENANT_ID, userContext }) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getGeneratedOptions({
            webauthnGeneratedOptionsId,
            tenantId,
            userContext: utils_2.getUserContext(userContext),
        });
    }
    static signUp({
        tenantId = constants_1.DEFAULT_TENANT_ID,
        webauthnGeneratedOptionsId,
        credential,
        session,
        userContext,
    }) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
            webauthnGeneratedOptionsId,
            credential,
            session,
            shouldTryLinkingWithSessionUser: !!session,
            tenantId,
            userContext: utils_2.getUserContext(userContext),
        });
    }
    static signIn({
        tenantId = constants_1.DEFAULT_TENANT_ID,
        webauthnGeneratedOptionsId,
        credential,
        session,
        userContext,
    }) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.signIn({
            webauthnGeneratedOptionsId,
            credential,
            session,
            shouldTryLinkingWithSessionUser: !!session,
            tenantId,
            userContext: utils_2.getUserContext(userContext),
        });
    }
    static async verifyCredentials({
        tenantId = constants_1.DEFAULT_TENANT_ID,
        webauthnGeneratedOptionsId,
        credential,
        userContext,
    }) {
        const resp = await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.verifyCredentials({
            webauthnGeneratedOptionsId,
            credential,
            tenantId,
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
    static generateRecoverAccountToken({ tenantId = constants_1.DEFAULT_TENANT_ID, userId, email, userContext }) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.generateRecoverAccountToken({
            userId,
            email,
            tenantId,
            userContext: utils_2.getUserContext(userContext),
        });
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
    static consumeRecoverAccountToken({ tenantId = constants_1.DEFAULT_TENANT_ID, token, userContext }) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.consumeRecoverAccountToken({
            token,
            tenantId,
            userContext: utils_2.getUserContext(userContext),
        });
    }
    static registerCredential({ recipeUserId, webauthnGeneratedOptionsId, credential, userContext }) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.registerCredential({
            recipeUserId,
            webauthnGeneratedOptionsId,
            credential,
            userContext: utils_2.getUserContext(userContext),
        });
    }
    static async createRecoverAccountLink({ tenantId = constants_1.DEFAULT_TENANT_ID, userId, email, userContext }) {
        let token = await this.generateRecoverAccountToken({ tenantId, userId, email, userContext });
        if (token.status === "UNKNOWN_USER_ID_ERROR") {
            return token;
        }
        const ctx = utils_2.getUserContext(userContext);
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return {
            status: "OK",
            link: utils_1.getRecoverAccountLink({
                appInfo: recipeInstance.getAppInfo(),
                token: token.token,
                tenantId,
                request: __1.getRequestFromUserContext(ctx),
                userContext: ctx,
            }),
        };
    }
    static async sendRecoverAccountEmail({ tenantId = constants_1.DEFAULT_TENANT_ID, userId, email, userContext }) {
        const user = await __1.getUser(userId, userContext);
        if (!user) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }
        const loginMethod = user.loginMethods.find((m) => m.recipeId === "webauthn" && m.hasSameEmailAs(email));
        if (!loginMethod) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }
        let link = await this.createRecoverAccountLink({ tenantId, userId, email, userContext });
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
                tenantId: input.tenantId || constants_1.DEFAULT_TENANT_ID,
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
exports.getGeneratedOptions = Wrapper.getGeneratedOptions;
