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

import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import type { User } from "../../types";
import NormalisedURLPath from "../../normalisedURLPath";
import { maxVersion } from "../../utils";

export default function getRecipeImplementation(querier: Querier): RecipeInterface {
    return {
        getRecipeUserIdsForPrimaryUserIds: async function ({
            primaryUserIds,
        }: {
            primaryUserIds: string[];
        }): Promise<{
            [primaryUserId: string]: string[];
        }> {
            return querier.sendGetRequest(new NormalisedURLPath("/recipe/accountlinking/users"), {
                primaryUserIds: primaryUserIds.join(","),
            });
        },
        getPrimaryUserIdsforRecipeUserIds: async function ({
            recipeUserIds,
        }: {
            recipeUserIds: string[];
        }): Promise<{
            [recipeUserId: string]: string | null;
        }> {
            return querier.sendGetRequest(new NormalisedURLPath("/recipe/accountlinking/users"), {
                recipeUserIds: recipeUserIds.join(","),
            });
        },
        addNewRecipeUserIdWithoutPrimaryUserId: async function ({
            recipeUserId,
            recipeId,
            timeJoined,
        }: {
            recipeUserId: string;
            recipeId: string;
            timeJoined: number;
        }): Promise<void> {
            return querier.sendPutRequest(new NormalisedURLPath("/recipe/accountlinking/user"), {
                recipeUserId,
                recipeId,
                timeJoined,
            });
        },
        getUsers: async function ({
            timeJoinedOrder,
            limit,
            paginationToken,
            includeRecipeIds,
        }: {
            timeJoinedOrder: "ASC" | "DESC";
            limit?: number;
            paginationToken?: string;
            includeRecipeIds?: string[];
        }): Promise<{
            users: User[];
            nextPaginationToken?: string;
        }> {
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.7") === "2.7") {
                throw new Error(
                    "Please use core version >= 3.5 to call this function. Otherwise, you can call <YourRecipe>.getUsersOldestFirst() or <YourRecipe>.getUsersNewestFirst() instead (for example, EmailPassword.getUsersOldestFirst())"
                );
            }
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
        canCreatePrimaryUserId: async function (_input: {
            recipeUserId: string;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
              }
            | {
                  status:
                      | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
        > {
            return {
                status: "OK",
            };
        },
        createPrimaryUser: async function (_input: {
            recipeUserId: string;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  user: User;
              }
            | {
                  status:
                      | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
        > {
            return {
                status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                primaryUserId: "",
                description: "",
            };
        },
        canLinkAccounts: async function (_input: {
            recipeUserId: string;
            primaryUserId: string;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  description: string;
                  primaryUserId: string;
              }
            | {
                  status: "ACCOUNTS_ALREADY_LINKED_ERROR";
                  description: string;
              }
            | {
                  status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
        > {
            return {
                status: "OK",
            };
        },
        linkAccounts: async function (_input: {
            recipeUserId: string;
            primaryUserId: string;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
            | {
                  status: "ACCOUNTS_ALREADY_LINKED_ERROR";
                  description: string;
              }
            | {
                  status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                  primaryUserId: string;
                  description: string;
              }
        > {
            return {
                status: "OK",
            };
        },
        unlinkAccounts: async function (_ipnut: {
            recipeUserId: string;
            userContext: any;
        }): Promise<{
            status: "OK";
            wasRecipeUserDeleted: boolean;
        }> {
            return {
                status: "OK",
                wasRecipeUserDeleted: false,
            };
        },
    };
}
