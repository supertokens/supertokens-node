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
import NormalisedURLPath from "../../normalisedURLPath";
import { getUser } from "../..";
import RecipeUserId from "../../recipeUserId";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
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
                email = user.loginMethods.find(
                    (lm) =>
                        lm.recipeId === "webauthn" &&
                        lm.recipeUserId.getAsString() === result.recipeUserId.getAsString()
                )?.email;
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
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/options/register`
                ),
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
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/options/signin`
                ),
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
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/signin`
                ),
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
                new NormalisedURLPath(
                    `/${input.tenantId === undefined ? DEFAULT_TENANT_ID : input.tenantId}/recipe/webauthn/signup`
                ),
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
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/user/recover/token`
                ),
                {
                    userId,
                    email,
                },
                userContext
            );
        },

        consumeRecoverAccountToken: async function ({ token, tenantId, userContext }) {
            return await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${
                        tenantId === undefined ? DEFAULT_TENANT_ID : tenantId
                    }/recipe/webauthn/user/recover/token/consume`
                ),
                {
                    token,
                },
                userContext
            );
        },

        registerCredential: async function ({ webauthnGeneratedOptionsId, credential, userContext, recipeUserId }) {
            return await querier.sendPostRequest(
                new NormalisedURLPath(`/recipe/webauthn/user/credential/register`),
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
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/user/recover`
                ),
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
                new NormalisedURLPath(`/recipe/webauthn/user/credential/remove`),
                {},
                { recipeUserId, webauthnCredentialId },
                userContext
            );
        },

        getCredential: async function ({ webauthnCredentialId, recipeUserId, userContext }) {
            const resp = await querier.sendGetRequest(
                new NormalisedURLPath(`/recipe/webauthn/user/credential`),
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
            return await querier.sendGetRequest(
                new NormalisedURLPath(`/recipe/webauthn/user/credential/list`),
                { recipeUserId },
                userContext
            );
        },

        removeGeneratedOptions: async function ({ webauthnGeneratedOptionsId, tenantId, userContext }) {
            return await querier.sendDeleteRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/options/remove`
                ),
                {},
                { webauthnGeneratedOptionsId },
                userContext
            );
        },

        getGeneratedOptions: async function ({ webauthnGeneratedOptionsId, tenantId, userContext }) {
            return await querier.sendGetRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/options`
                ),
                { webauthnGeneratedOptionsId },
                userContext
            );
        },

        updateUserEmail: async function ({ email, recipeUserId, tenantId, userContext }) {
            return await querier.sendPutRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/user/email`
                ),
                { email, recipeUserId },
                {},
                userContext
            );
        },
    };
}
