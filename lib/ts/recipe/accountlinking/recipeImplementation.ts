/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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

import { AccountInfoInput, RecipeInterface, TypeNormalisedInput } from "./types";
import { Querier } from "../../querier";
import RecipeUserId from "../../recipeUserId";
import type AccountLinkingRecipe from "./recipe";
import { User } from "../../user";
import type { UserContext, User as UserType } from "../../types";

export default function getRecipeImplementation(
    querier: Querier,
    config: TypeNormalisedInput,
    recipeInstance: AccountLinkingRecipe
): RecipeInterface {
    return {
        getUsers: async function (
            this: RecipeInterface,
            {
                tenantId,
                timeJoinedOrder,
                limit,
                paginationToken,
                includeRecipeIds,
                query,
                userContext,
            }: {
                tenantId: string;
                timeJoinedOrder: "ASC" | "DESC";
                limit?: number;
                paginationToken?: string;
                includeRecipeIds?: string[];
                query?: { [key: string]: string };
                userContext: UserContext;
            }
        ): Promise<{
            users: UserType[];
            nextPaginationToken?: string;
        }> {
            let includeRecipeIdsStr = undefined;
            if (includeRecipeIds !== undefined) {
                includeRecipeIdsStr = includeRecipeIds.join(",");
            }
            let response = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/users",
                    params: {
                        tenantId: tenantId ?? "public",
                    },
                },
                {
                    includeRecipeIds: includeRecipeIdsStr,
                    timeJoinedOrder: timeJoinedOrder,
                    limit: limit,
                    paginationToken: paginationToken,
                    ...query,
                },
                userContext
            );
            return {
                users: response.users.map((u: any) => new User(u)),
                nextPaginationToken: response.nextPaginationToken,
            };
        },
        canCreatePrimaryUser: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                userContext,
            }: {
                recipeUserId: RecipeUserId;
                userContext: UserContext;
            }
        ): Promise<
            | {
                  status: "OK";
                  wasAlreadyAPrimaryUser: boolean;
              }
            | {
                  status:
                      | "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
                      | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
        > {
            return await querier.sendGetRequest(
                "/recipe/accountlinking/user/primary/check",
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
        },

        createPrimaryUser: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                userContext,
            }: {
                recipeUserId: RecipeUserId;
                userContext: UserContext;
            }
        ): Promise<
            | {
                  status: "OK";
                  user: User;
                  wasAlreadyAPrimaryUser: boolean;
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
              }
            | {
                  status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
        > {
            let response = await querier.sendPostRequest(
                "/recipe/accountlinking/user/primary",
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
            if (response.status === "OK") {
                return {
                    ...response,
                    user: User.fromApi(response.user),
                };
            }
            return response;
        },

        canLinkAccounts: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                primaryUserId,
                userContext,
            }: {
                recipeUserId: RecipeUserId;
                primaryUserId: string;
                userContext: UserContext;
            }
        ): Promise<
            | {
                  status: "OK";
                  accountsAlreadyLinked: boolean;
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  description: string;
                  primaryUserId: string;
              }
            | {
                  status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
            | {
                  status: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
              }
        > {
            let result = await querier.sendGetRequest(
                "/recipe/accountlinking/user/link/check",
                {
                    recipeUserId: recipeUserId.getAsString(),
                    primaryUserId,
                },
                userContext
            );

            return result;
        },

        linkAccounts: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                primaryUserId,
                userContext,
            }: {
                recipeUserId: RecipeUserId;
                primaryUserId: string;
                userContext: UserContext;
            }
        ): Promise<
            | {
                  status: "OK";
                  accountsAlreadyLinked: boolean;
                  user: User;
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  user: User;
                  primaryUserId: string;
              }
            | {
                  status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
            | {
                  status: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
              }
        > {
            const accountsLinkingResult = await querier.sendPostRequest(
                "/recipe/accountlinking/user/link",
                {
                    recipeUserId: recipeUserId.getAsString(),
                    primaryUserId,
                },
                userContext
            );

            if (accountsLinkingResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                return {
                    ...accountsLinkingResult,
                    user: User.fromApi(accountsLinkingResult.user),
                };
            }

            if (accountsLinkingResult.status === "OK") {
                let user: UserType = User.fromApi(accountsLinkingResult.user);
                if (!accountsLinkingResult.accountsAlreadyLinked) {
                    await recipeInstance.verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                        user: user,
                        recipeUserId,
                        userContext,
                    });

                    const updatedUser = await this.getUser({
                        userId: primaryUserId,
                        userContext,
                    });
                    if (updatedUser === undefined) {
                        throw Error("this error should never be thrown");
                    }
                    user = updatedUser;
                    let loginMethodInfo = user.loginMethods.find(
                        (u) => u.recipeUserId.getAsString() === recipeUserId.getAsString()
                    );
                    if (loginMethodInfo === undefined) {
                        throw Error("this error should never be thrown");
                    }

                    await config.onAccountLinked(user, loginMethodInfo, userContext);
                }
                return {
                    ...accountsLinkingResult,
                    user,
                };
            }

            return accountsLinkingResult;
        },

        unlinkAccount: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                userContext,
            }: {
                recipeUserId: RecipeUserId;
                userContext: UserContext;
            }
        ): Promise<{
            status: "OK";
            wasRecipeUserDeleted: boolean;
            wasLinked: boolean;
        }> {
            let accountsUnlinkingResult = await querier.sendPostRequest(
                "/recipe/accountlinking/user/unlink",
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
            return accountsUnlinkingResult;
        },

        getUser: async function (this: RecipeInterface, { userId, userContext }): Promise<User | undefined> {
            let result = await querier.sendGetRequest(
                "/user/id",
                {
                    userId,
                },
                userContext
            );
            if (result.status === "OK") {
                return new User(result.user);
            }
            return undefined;
        },

        listUsersByAccountInfo: async function (
            this: RecipeInterface,
            {
                tenantId,
                accountInfo,
                doUnionOfAccountInfo,
                userContext,
            }: {
                tenantId: string;
                accountInfo: AccountInfoInput;
                doUnionOfAccountInfo: boolean;
                userContext: UserContext;
            }
        ): Promise<UserType[]> {
            let result = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/users/by-accountinfo",
                    params: {
                        tenantId: tenantId ?? "public",
                    },
                },
                {
                    email: accountInfo.email,
                    phoneNumber: accountInfo.phoneNumber,
                    thirdPartyId: accountInfo.thirdParty?.id,
                    thirdPartyUserId: accountInfo.thirdParty?.userId,
                    webauthnCredentialId: accountInfo.webauthn?.credentialId,
                    doUnionOfAccountInfo,
                },
                userContext
            );
            return result.users.map((u: any) => new User(u));
        },

        deleteUser: async function (
            this: RecipeInterface,
            {
                userId,
                removeAllLinkedAccounts,
                userContext,
            }: {
                userId: string;
                removeAllLinkedAccounts: boolean;
                userContext: UserContext;
            }
        ): Promise<{
            status: "OK";
        }> {
            return await querier.sendPostRequest(
                "/user/remove",
                {
                    userId,
                    removeAllLinkedAccounts,
                },
                userContext
            );
        },
    };
}
