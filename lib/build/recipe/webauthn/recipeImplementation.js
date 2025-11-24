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
exports.default = getRecipeInterface;
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const __1 = require("../..");
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
const user_1 = require("../../user");
const authUtils_1 = require("../../authUtils");
function getRecipeInterface(querier, getWebauthnConfig) {
    return {
        registerOptions: async function (_a) {
            var _b, _c;
            var {
                    relyingPartyId,
                    relyingPartyName,
                    origin,
                    timeout,
                    attestation = "none",
                    tenantId,
                    userContext,
                    supportedAlgorithmIds,
                    userVerification,
                    userPresence,
                    residentKey,
                } = _a,
                rest = __rest(_a, [
                    "relyingPartyId",
                    "relyingPartyName",
                    "origin",
                    "timeout",
                    "attestation",
                    "tenantId",
                    "userContext",
                    "supportedAlgorithmIds",
                    "userVerification",
                    "userPresence",
                    "residentKey",
                ]);
            const emailInput = "email" in rest ? rest.email : undefined;
            const recoverAccountTokenInput = "recoverAccountToken" in rest ? rest.recoverAccountToken : undefined;
            let email;
            if (emailInput !== undefined) {
                email = emailInput;
            } else if (recoverAccountTokenInput !== undefined) {
                const result = await this.getUserFromRecoverAccountToken({
                    token: recoverAccountTokenInput,
                    tenantId,
                    userContext,
                });
                if (result.status !== "OK") {
                    return result;
                }
                const user = result.user;
                // if the recipeUserId is not present, it means that the user does not have a webauthn login method and we should just use the user id
                // this will make account recovery act as a sign up
                const userId =
                    ((_b = result.recipeUserId) === null || _b === void 0 ? void 0 : _b.getAsString()) || user.id;
                email =
                    (_c = user.loginMethods.find((lm) => lm.recipeUserId.getAsString() === userId)) === null ||
                    _c === void 0
                        ? void 0
                        : _c.email;
            }
            if (!email) {
                return {
                    status: "INVALID_EMAIL_ERROR",
                    err: "The email is missing",
                };
            }
            const err = await getWebauthnConfig().validateEmailAddress(email, tenantId, userContext);
            if (err) {
                return {
                    status: "INVALID_EMAIL_ERROR",
                    err,
                };
            }
            let displayName;
            if ("displayName" in rest && rest.displayName !== undefined) {
                displayName = rest.displayName;
            } else {
                displayName = email;
            }
            return await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/webauthn/options/register",
                    params: {
                        tenantId: tenantId,
                    },
                },
                {
                    email,
                    displayName,
                    relyingPartyName,
                    relyingPartyId,
                    origin,
                    timeout,
                    attestation,
                    supportedAlgorithmIds,
                    userVerification,
                    userPresence,
                    residentKey,
                },
                userContext
            );
        },
        signInOptions: async function ({
            relyingPartyId,
            relyingPartyName,
            origin,
            timeout,
            userVerification,
            userPresence,
            tenantId,
            userContext,
        }) {
            return await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/webauthn/options/signin",
                    params: {
                        tenantId: tenantId,
                    },
                },
                {
                    userVerification,
                    userPresence,
                    relyingPartyId,
                    relyingPartyName,
                    origin,
                    timeout,
                },
                userContext
            );
        },
        signUp: async function ({
            webauthnGeneratedOptionsId,
            credential,
            tenantId,
            session,
            shouldTryLinkingWithSessionUser,
            userContext,
        }) {
            const response = await this.createNewRecipeUser({
                credential,
                webauthnGeneratedOptionsId,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                return response;
            }
            const linkResult =
                await authUtils_1.AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
                    tenantId,
                    inputUser: response.user,
                    recipeUserId: response.recipeUserId,
                    session,
                    shouldTryLinkingWithSessionUser,
                    userContext,
                });
            if (linkResult.status != "OK") {
                return linkResult;
            }
            return {
                status: "OK",
                user: linkResult.user,
                recipeUserId: response.recipeUserId,
            };
        },
        signIn: async function ({
            credential,
            webauthnGeneratedOptionsId,
            tenantId,
            session,
            shouldTryLinkingWithSessionUser,
            userContext,
        }) {
            const response = await this.verifyCredentials({
                credential,
                webauthnGeneratedOptionsId,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                return response;
            }
            const loginMethod = response.user.loginMethods.find(
                (lm) => lm.recipeUserId.getAsString() === response.recipeUserId.getAsString()
            );
            if (!loginMethod.verified) {
                await recipe_1.default.getInstanceOrThrowError().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    user: response.user,
                    recipeUserId: response.recipeUserId,
                    userContext,
                });
                // We do this so that we get the updated user (in case the above
                // function updated the verification status) and can return that
                response.user = await (0, __1.getUser)(response.recipeUserId.getAsString(), userContext);
            }
            const linkResult =
                await authUtils_1.AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
                    tenantId,
                    inputUser: response.user,
                    recipeUserId: response.recipeUserId,
                    session,
                    shouldTryLinkingWithSessionUser,
                    userContext,
                });
            if (linkResult.status === "LINKING_TO_SESSION_USER_FAILED") {
                return linkResult;
            }
            response.user = linkResult.user;
            return response;
        },
        verifyCredentials: async function ({ credential, webauthnGeneratedOptionsId, tenantId, userContext }) {
            const response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/webauthn/signin",
                    params: {
                        tenantId: tenantId,
                    },
                },
                {
                    credential,
                    webauthnGeneratedOptionsId,
                },
                userContext
            );
            if (response.status === "OK") {
                return {
                    status: "OK",
                    user: new user_1.User(response.user),
                    recipeUserId: new recipeUserId_1.default(response.recipeUserId),
                };
            }
            return response;
        },
        createNewRecipeUser: async function (input) {
            const resp = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/webauthn/signup",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                {
                    webauthnGeneratedOptionsId: input.webauthnGeneratedOptionsId,
                    credential: input.credential,
                },
                input.userContext
            );
            if (resp.status === "OK") {
                return {
                    status: "OK",
                    user: new user_1.User(resp.user),
                    recipeUserId: new recipeUserId_1.default(resp.recipeUserId),
                };
            }
            return resp;
        },
        generateRecoverAccountToken: async function ({ userId, email, tenantId, userContext }) {
            return await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/webauthn/user/recover/token",
                    params: {
                        tenantId: tenantId,
                    },
                },
                {
                    userId,
                    email,
                },
                userContext
            );
        },
        consumeRecoverAccountToken: async function ({ token, tenantId, userContext }) {
            return await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/webauthn/user/recover/token/consume",
                    params: {
                        tenantId: tenantId,
                    },
                },
                {
                    token,
                },
                userContext
            );
        },
        registerCredential: async function ({ webauthnGeneratedOptionsId, credential, userContext, recipeUserId }) {
            return await querier.sendPostRequest(
                "/recipe/webauthn/user/credential/register",
                {
                    recipeUserId,
                    webauthnGeneratedOptionsId,
                    credential,
                },
                userContext
            );
        },
        getUserFromRecoverAccountToken: async function ({ token, tenantId, userContext }) {
            const resp = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/webauthn/user/recover",
                    params: {
                        tenantId: tenantId,
                    },
                },
                { token },
                userContext
            );
            if (resp.status === "OK") {
                return Object.assign(Object.assign({}, resp), {
                    user: new user_1.User(resp.user),
                    recipeUserId: resp.recipeUserId ? new recipeUserId_1.default(resp.recipeUserId) : undefined,
                });
            }
            return resp;
        },
        removeCredential: async function ({ webauthnCredentialId, recipeUserId, userContext }) {
            return await querier.sendDeleteRequest(
                "/recipe/webauthn/user/credential/remove",
                undefined,
                { recipeUserId, webauthnCredentialId },
                userContext
            );
        },
        getCredential: async function ({ webauthnCredentialId, recipeUserId, userContext }) {
            const resp = await querier.sendGetRequest(
                "/recipe/webauthn/user/credential",
                { webauthnCredentialId, recipeUserId },
                userContext
            );
            if (resp.status === "OK") {
                return Object.assign(Object.assign({}, resp), {
                    recipeUserId: new recipeUserId_1.default(resp.recipeUserId),
                });
            }
            return resp;
        },
        listCredentials: async function ({ recipeUserId, userContext }) {
            return await querier.sendGetRequest("/recipe/webauthn/user/credential/list", { recipeUserId }, userContext);
        },
        removeGeneratedOptions: async function ({ webauthnGeneratedOptionsId, tenantId, userContext }) {
            return await querier.sendDeleteRequest(
                {
                    path: "/<tenantId>/recipe/webauthn/options/remove",
                    params: {
                        tenantId: tenantId,
                    },
                },
                undefined,
                { webauthnGeneratedOptionsId },
                userContext
            );
        },
        getGeneratedOptions: async function ({ webauthnGeneratedOptionsId, tenantId, userContext }) {
            return await querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/webauthn/options",
                    params: {
                        tenantId: tenantId || "public",
                    },
                },
                { webauthnGeneratedOptionsId },
                userContext
            );
        },
        updateUserEmail: async function ({ email, recipeUserId, tenantId, userContext }) {
            return await querier.sendPutRequest(
                {
                    path: "/<tenantId>/recipe/webauthn/user/email",
                    params: {
                        tenantId: tenantId,
                    },
                },
                { email, recipeUserId },
                {},
                userContext
            );
        },
    };
}
