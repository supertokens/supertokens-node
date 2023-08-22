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

import { AccountInfo, RecipeInterface, TypeNormalisedInput } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeUserId from "../../recipeUserId";
import type AccountLinkingRecipe from "./recipe";
import { User } from "../../user";
import type { User as UserType } from "../../types";

export default function getRecipeImplementation(
    querier: Querier,
    config: TypeNormalisedInput,
    recipeInstance: AccountLinkingRecipe
): RecipeInterface {
    return {
        getUsers: async function (
            this: RecipeInterface,
            {
                timeJoinedOrder,
                limit,
                paginationToken,
                includeRecipeIds,
                query,
            }: {
                timeJoinedOrder: "ASC" | "DESC";
                limit?: number;
                paginationToken?: string;
                includeRecipeIds?: string[];
                query?: { [key: string]: string };
            }
        ): Promise<{
            users: UserType[];
            nextPaginationToken?: string;
        }> {
            let includeRecipeIdsStr = undefined;
            if (includeRecipeIds !== undefined) {
                includeRecipeIdsStr = includeRecipeIds.join(",");
            }
            let response = await querier.sendGetRequest(new NormalisedURLPath("/users"), {
                includeRecipeIds: includeRecipeIdsStr,
                timeJoinedOrder: timeJoinedOrder,
                limit: limit,
                paginationToken: paginationToken,
                ...query,
            });
            return {
                users: response.users.map((u: any) => new User(u)),
                nextPaginationToken: response.nextPaginationToken,
            };
        },
        canCreatePrimaryUser: async function (
            this: RecipeInterface,
            {
                recipeUserId,
            }: {
                recipeUserId: RecipeUserId;
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
            return await querier.sendGetRequest(new NormalisedURLPath("/recipe/accountlinking/user/primary/check"), {
                recipeUserId: recipeUserId.getAsString(),
            });
        },

        createPrimaryUser: async function (
            this: RecipeInterface,
            {
                recipeUserId,
            }: {
                recipeUserId: RecipeUserId;
                userContext: any;
            }
        ): Promise<
            | {
                  status: "OK";
                  user: User;
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
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/accountlinking/user/primary"), {
                recipeUserId: recipeUserId.getAsString(),
            });
            if (response.status === "OK") {
                response.user = new User(response.user);
            }
            return response;
        },

        canLinkAccounts: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                primaryUserId,
            }: {
                recipeUserId: RecipeUserId;
                primaryUserId: string;
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
            let result = await querier.sendGetRequest(new NormalisedURLPath("/recipe/accountlinking/user/link/check"), {
                recipeUserId: recipeUserId.getAsString(),
                primaryUserId,
            });

            return result;
        },

        linkAccounts: async function (
            this: RecipeInterface,
            {
                tenantId,
                recipeUserId,
                primaryUserId,
                userContext,
            }: {
                tenantId: string;
                recipeUserId: RecipeUserId;
                primaryUserId: string;
                userContext: any;
            }
        ): Promise<
            | {
                  status: "OK";
                  accountsAlreadyLinked: boolean;
                  user: User;
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
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
                new NormalisedURLPath("/recipe/accountlinking/user/link"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                    primaryUserId,
                }
            );

            if (accountsLinkingResult.status === "OK") {
                let user: UserType | undefined;
                if (!accountsLinkingResult.accountsAlreadyLinked) {
                    await recipeInstance.verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                        tenantId,
                        recipeUserId,
                        userContext,
                    });

                    user = await this.getUser({
                        userId: primaryUserId,
                        userContext,
                    });
                    if (user === undefined) {
                        throw Error("this error should never be thrown");
                    }
                    let loginMethodInfo = user.loginMethods.find(
                        (u) => u.recipeUserId.getAsString() === recipeUserId.getAsString()
                    );
                    if (loginMethodInfo === undefined) {
                        throw Error("this error should never be thrown");
                    }

                    await config.onAccountLinked(user, loginMethodInfo, tenantId, userContext);
                } else {
                    // In the other case we get it after email verification
                    user = await this.getUser({
                        userId: primaryUserId,
                        userContext,
                    });
                }
                accountsLinkingResult.user = user;
            }

            return accountsLinkingResult;
        },

        unlinkAccount: async function (
            this: RecipeInterface,
            {
                recipeUserId,
            }: {
                recipeUserId: RecipeUserId;
            }
        ): Promise<{
            status: "OK";
            wasRecipeUserDeleted: boolean;
            wasLinked: boolean;
        }> {
            let accountsUnlinkingResult = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/accountlinking/user/unlink"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                }
            );
            return accountsUnlinkingResult;
        },

        getUser: async function (this: RecipeInterface, { userId }: { userId: string }): Promise<User | undefined> {
            let result = await querier.sendGetRequest(new NormalisedURLPath("/user/id"), {
                userId,
            });
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
            }: { tenantId: string; accountInfo: AccountInfo; doUnionOfAccountInfo: boolean }
        ): Promise<UserType[]> {
            let result = await querier.sendGetRequest(
                new NormalisedURLPath(`${tenantId ?? "public"}/users/by-accountinfo`),
                {
                    email: accountInfo.email,
                    phoneNumber: accountInfo.phoneNumber,
                    thirdPartyId: accountInfo.thirdParty?.id,
                    thirdPartyUserId: accountInfo.thirdParty?.userId,
                    doUnionOfAccountInfo,
                }
            );
            return result.users.map((u: any) => new User(u));
        },

        deleteUser: async function (
            this: RecipeInterface,
            {
                userId,
                removeAllLinkedAccounts,
            }: {
                userId: string;
                removeAllLinkedAccounts: boolean;
            }
        ): Promise<{
            status: "OK";
        }> {
            return await querier.sendPostRequest(new NormalisedURLPath("/user/remove"), {
                userId,
                removeAllLinkedAccounts,
            });
        },
    };
}
