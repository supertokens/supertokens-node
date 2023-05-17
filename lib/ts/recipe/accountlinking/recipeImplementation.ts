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
import { mockListUsersByAccountInfo, mockGetUser, mockFetchFromAccountToLinkTable, mockGetUsers } from "./mockCore";
import RecipeUserId from "../../recipeUserId";

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
            [primaryUserId: string]: RecipeUserId[];
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
                recipeUserIds: RecipeUserId[];
            }
        ): Promise<{
            [recipeUserId: string]: string | null;
        }> {
            let result = await querier.sendGetRequest(new NormalisedURLPath("/recipe/accountlinking/users"), {
                recipeUserIds: recipeUserIds.join(","),
            });
            return result.userIdMapping;
        },
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
            users: User[];
            nextPaginationToken?: string;
        }> {
            if (process.env.TEST_MODE !== "testing") {
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
                    users: response.users,
                    nextPaginationToken: response.nextPaginationToken,
                };
            } else {
                return await mockGetUsers(querier, {
                    timeJoinedOrder,
                    limit,
                    paginationToken,
                    includeRecipeIds,
                    query,
                });
            }
        },
        canCreatePrimaryUserId: async function (
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
                recipeUserId,
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
                recipeUserId,
            });

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
                recipeUserId: RecipeUserId;
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
                recipeUserId: RecipeUserId;
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
            let accountsUnlinkingResult = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/accountlinking/user/unlink"),
                {
                    recipeUserId,
                }
            );
            if (accountsUnlinkingResult.status === "OK" && !accountsUnlinkingResult.wasRecipeUserDeleted) {
                // we have the !accountsUnlinkingResult.wasRecipeUserDeleted check
                // cause if the user was deleted, it means that it's user ID was the
                // same as the primary user ID, AND that the primary user ID has more
                // than one login method - so if we revoke the session in this case,
                // it will revoke the session for all login methods as well (since recipeUserId == primaryUserID).

                // The reason we don't do this in the core is that if the user has overriden
                // session recipe, it goes through their logic.
                await Session.revokeAllSessionsForUser(recipeUserId, userContext);
            }

            return accountsUnlinkingResult;
        },

        getUser: async function (this: RecipeInterface, { userId }: { userId: string }): Promise<User | undefined> {
            if (process.env.MOCK !== "true") {
                let result = await querier.sendGetRequest(new NormalisedURLPath("/recipe/accountlinking/user"), {
                    userId,
                });
                if (result.status === "OK") {
                    return result.user;
                }
                return undefined;
            } else {
                return mockGetUser({ userId });
            }
        },

        listUsersByAccountInfo: async function (
            this: RecipeInterface,
            { accountInfo }: { accountInfo: AccountInfo }
        ): Promise<User[]> {
            if (process.env.MOCK !== "true") {
                let result = await querier.sendGetRequest(new NormalisedURLPath("/users/accountinfo"), {
                    ...accountInfo,
                });
                return result.users;
            } else {
                return mockListUsersByAccountInfo({ accountInfo });
            }
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

        fetchFromAccountToLinkTable: async function ({
            recipeUserId,
        }: {
            recipeUserId: RecipeUserId;
        }): Promise<string | undefined> {
            if (process.env.MOCK !== "true") {
                let result = await querier.sendGetRequest(
                    new NormalisedURLPath("/recipe/accountlinking/user/link/table"),
                    {
                        recipeUserId,
                    }
                );
                return result.user;
            } else {
                return mockFetchFromAccountToLinkTable({ recipeUserId });
            }
        },
        storeIntoAccountToLinkTable: async function ({
            recipeUserId,
            primaryUserId,
        }: {
            recipeUserId: RecipeUserId;
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
