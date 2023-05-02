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
import type { User } from "../../types";
import NormalisedURLPath from "../../normalisedURLPath";
import Session from "../session";

export default function getRecipeImplementation(querier: Querier, config: TypeNormalisedInput): RecipeInterface {
    return {
        getRecipeUserIdsForPrimaryUserIds: async function (
            this: RecipeInterface,
            {
                primaryUserIds,
            }: {
                primaryUserIds: string[];
            }
        ): Promise<{
            [primaryUserId: string]: string[];
        }> {
            let result = await querier.sendGetRequest(new NormalisedURLPath("/recipe/accountlinking/users"), {
                primaryUserIds: primaryUserIds.join(","),
            });
            return result.userIdMapping;
        },
        getPrimaryUserIdsForRecipeUserIds: async function (
            this: RecipeInterface,
            {
                recipeUserIds,
            }: {
                recipeUserIds: string[];
            }
        ): Promise<{
            [recipeUserId: string]: string | null;
        }> {
            let result = await querier.sendGetRequest(new NormalisedURLPath("/recipe/accountlinking/users"), {
                recipeUserIds: recipeUserIds.join(","),
            });
            return result.userIdMapping;
        },
        addNewRecipeUserIdWithoutPrimaryUserId: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                recipeId,
                timeJoined,
            }: {
                recipeUserId: string;
                recipeId: "emailpassword" | "thirdparty" | "passwordless";
                timeJoined: number;
            }
        ): Promise<{
            status: "OK";
            createdNewEntry: boolean;
        }> {
            return querier.sendPutRequest(new NormalisedURLPath("/recipe/accountlinking/user"), {
                recipeUserId,
                recipeId,
                timeJoined,
            });
        },
        getUsers: async function (
            this: RecipeInterface,
            {
                timeJoinedOrder,
                limit,
                paginationToken,
                includeRecipeIds,
            }: {
                timeJoinedOrder: "ASC" | "DESC";
                limit?: number;
                paginationToken?: string;
                includeRecipeIds?: string[];
            }
        ): Promise<{
            users: User[];
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
            });
            return {
                users: response.users,
                nextPaginationToken: response.nextPaginationToken,
            };
        },
        canCreatePrimaryUserId: async function (
            this: RecipeInterface,
            {
                recipeUserId,
            }: {
                recipeUserId: string;
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
            let result = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/accountlinking/user/primary/check"),
                {
                    recipeUserId,
                }
            );
            return result;
        },
        createPrimaryUser: async function (
            this: RecipeInterface,
            {
                recipeUserId,
            }: {
                recipeUserId: string;
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
            let result = await querier.sendPostRequest(new NormalisedURLPath("/recipe/accountlinking/user/primary"), {
                recipeUserId,
            });

            return result;
        },
        canLinkAccounts: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                primaryUserId,
            }: {
                recipeUserId: string;
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
        > {
            let result = await querier.sendGetRequest(new NormalisedURLPath("/recipe/accountlinking/user/link/check"), {
                recipeUserId,
                primaryUserId,
            });

            return result;
        },
        linkAccounts: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                primaryUserId,
                userContext,
            }: {
                recipeUserId: string;
                primaryUserId: string;
                userContext: any;
            }
        ): Promise<
            | {
                  status: "OK";
                  accountsAlreadyLinked: boolean;
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
        > {
            let accountsLinkingResult = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/accountlinking/user/link"),
                {
                    recipeUserId,
                    primaryUserId,
                }
            );
            if (accountsLinkingResult.status === "OK" && !accountsLinkingResult.accountsAlreadyLinked) {
                await Session.revokeAllSessionsForUser(recipeUserId, userContext);
                let user: User | undefined = await this.getUser({
                    userId: primaryUserId,
                    userContext,
                });
                if (user === undefined) {
                    throw Error("this error should never be thrown");
                }
                let loginMethodInfo = user.loginMethods.find((u) => u.recipeUserId === recipeUserId);
                if (loginMethodInfo === undefined) {
                    throw Error("this error should never be thrown");
                }

                await config.onAccountLinked(user, loginMethodInfo, userContext);
            }

            return accountsLinkingResult;
        },
        unlinkAccounts: async function (
            this: RecipeInterface,
            {
                recipeUserId,
                userContext,
            }: {
                recipeUserId: string;
                userContext: any;
            }
        ): Promise<
            | {
                  status: "OK";
                  wasRecipeUserDeleted: boolean;
              }
            | {
                  status: "PRIMARY_USER_NOT_FOUND_ERROR" | "RECIPE_USER_NOT_FOUND_ERROR";
                  description: string;
              }
        > {
            let recipeUserIdToPrimaryUserIdMapping = await this.getPrimaryUserIdsForRecipeUserIds({
                recipeUserIds: [recipeUserId],
                userContext,
            });
            let primaryUserId = recipeUserIdToPrimaryUserIdMapping[recipeUserId];
            if (primaryUserId === undefined) {
                return {
                    status: "RECIPE_USER_NOT_FOUND_ERROR",
                    description: "No user exists with the provided recipeUserId",
                };
            }
            if (primaryUserId === null) {
                return {
                    status: "PRIMARY_USER_NOT_FOUND_ERROR",
                    description:
                        "The input recipeUserId is not linked to any primary user, or is not a primary user itself",
                };
            }

            if (primaryUserId === recipeUserId) {
                let user = await this.getUser({
                    userId: primaryUserId,
                    userContext,
                });

                if (user === undefined) {
                    // this can happen cause of some race condition..
                    return this.unlinkAccounts({
                        recipeUserId,
                        userContext,
                    });
                }
                if (user.loginMethods.length > 1) {
                    // we delete the user here cause if we didn't
                    // do that, then it would result in the primary user ID having the same
                    // user ID as the recipe user ID, but they are not linked. So this is not allowed.
                    await this.deleteUser({
                        userId: recipeUserId,
                        removeAllLinkedAccounts: false,
                        userContext,
                    });

                    return {
                        status: "OK",
                        wasRecipeUserDeleted: true,
                    };
                }
            }
            let accountsUnlinkingResult = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/accountlinking/user/unlink"),
                {
                    recipeUserId,
                    primaryUserId,
                }
            );
            if (accountsUnlinkingResult.status === "OK") {
                await Session.revokeAllSessionsForUser(recipeUserId, userContext);
            }

            return accountsUnlinkingResult;
        },
        getUser: async function (this: RecipeInterface, { userId }: { userId: string }): Promise<User | undefined> {
            let result = await querier.sendGetRequest(new NormalisedURLPath("/recipe/accountlinking/user"), {
                userId,
            });
            if (result.status === "OK") {
                return result.user;
            }
            return undefined;
        },
        listUsersByAccountInfo: async function (
            this: RecipeInterface,
            { accountInfo }: { accountInfo: AccountInfo }
        ): Promise<User[]> {
            let result = await querier.sendGetRequest(new NormalisedURLPath("/users/accountinfo"), {
                ...accountInfo,
            });
            return result.users;
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
            let result = await querier.sendPostRequest(new NormalisedURLPath("/user/remove"), {
                userId,
                removeAllLinkedAccounts,
            });
            return result;
        },
        fetchFromAccountToLinkTable: async function ({
            recipeUserId,
        }: {
            recipeUserId: string;
        }): Promise<User | undefined> {
            let result = await querier.sendGetRequest(new NormalisedURLPath("/recipe/accountlinking/user/link/table"), {
                recipeUserId,
            });
            return result.user;
        },
        storeIntoAccountToLinkTable: async function ({
            recipeUserId,
            primaryUserId,
        }: {
            recipeUserId: string;
            primaryUserId: string;
        }): Promise<
            | {
                  status: "OK";
                  didInsertNewRow: boolean;
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
              }
        > {
            let result = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/accountlinking/user/link/table"),
                {
                    recipeUserId,
                    primaryUserId,
                }
            );
            return result;
        },
    };
}
