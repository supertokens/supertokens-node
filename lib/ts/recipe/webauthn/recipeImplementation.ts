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

import { RecipeInterface, TypeNormalisedInput } from "./types";
import AccountLinking from "../accountlinking/recipe";
import { Querier } from "../../querier";
import { getUser } from "../..";
import RecipeUserId from "../../recipeUserId";
import { LoginMethod, User } from "../../user";
import { AuthUtils } from "../../authUtils";

export default function getRecipeInterface(
    querier: Querier,
    getWebauthnConfig: () => TypeNormalisedInput
): RecipeInterface {
    return {
        registerOptions: async function ({
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
            ...rest
        }) {
            const emailInput = "email" in rest ? rest.email : undefined;
            const recoverAccountTokenInput = "recoverAccountToken" in rest ? rest.recoverAccountToken : undefined;

            let email: string | undefined;
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

                const user = result.user as User;
                // if the recipeUserId is not present, it means that the user does not have a webauthn login method and we should just use the user id
                // this will make account recovery act as a sign up
                const userId = result.recipeUserId?.getAsString() || user.id;
                email = user.loginMethods.find((lm) => lm.recipeUserId.getAsString() === userId)?.email;
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

            let displayName: string;
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

        signUp: async function (
            this: RecipeInterface,
            { webauthnGeneratedOptionsId, credential, tenantId, session, shouldTryLinkingWithSessionUser, userContext }
        ) {
            const response = await this.createNewRecipeUser({
                credential,
                webauthnGeneratedOptionsId,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                return response;
            }

            const linkResult = await AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
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

        signIn: async function (
            this: RecipeInterface,
            { credential, webauthnGeneratedOptionsId, tenantId, session, shouldTryLinkingWithSessionUser, userContext }
        ) {
            const response = await this.verifyCredentials({
                credential,
                webauthnGeneratedOptionsId,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                return response;
            }

            const loginMethod: LoginMethod = response.user.loginMethods.find(
                (lm: LoginMethod) => lm.recipeUserId.getAsString() === response.recipeUserId.getAsString()
            )!;

            if (!loginMethod.verified) {
                await AccountLinking.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    user: response.user,
                    recipeUserId: response.recipeUserId,
                    userContext,
                });

                // We do this so that we get the updated user (in case the above
                // function updated the verification status) and can return that
                response.user = (await getUser(response.recipeUserId!.getAsString(), userContext))!;
            }

            const linkResult = await AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
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
                    user: new User(response.user),
                    recipeUserId: new RecipeUserId(response.recipeUserId),
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
                    user: new User(resp.user),
                    recipeUserId: new RecipeUserId(resp.recipeUserId),
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
                return {
                    ...resp,
                    user: new User(resp.user),
                    recipeUserId: new RecipeUserId(resp.recipeUserId),
                };
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
                return {
                    ...resp,
                    recipeUserId: new RecipeUserId(resp.recipeUserId),
                };
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
                        tenantId: tenantId,
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
