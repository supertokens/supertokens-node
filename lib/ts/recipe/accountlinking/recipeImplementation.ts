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

import { RecipeInterface, TypeNormalisedInput } from "./types";
import { Querier } from "../../querier";
import type { User } from "../../types";
import NormalisedURLPath from "../../normalisedURLPath";
import { maxVersion } from "../../utils";
import { getUser, listUsersByAccountInfo, deleteUser } from "../../";
import Session from "../session";

export default function getRecipeImplementation(querier: Querier, config: TypeNormalisedInput): RecipeInterface {
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
        }): Promise<
            | {
                  status: "OK";
                  createdNewEntry: boolean;
              }
            | {
                  status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              }
        > {
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
        canCreatePrimaryUserId: async function ({
            recipeUserId,
        }: {
            recipeUserId: string;
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
            let recipeUserIdToPrimaryUserIdMapping = await this.getPrimaryUserIdsforRecipeUserIds({
                recipeUserIds: [recipeUserId],
            });

            if (
                recipeUserIdToPrimaryUserIdMapping[recipeUserId] !== undefined &&
                recipeUserIdToPrimaryUserIdMapping[recipeUserId] !== null
            ) {
                return {
                    status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                    primaryUserId: recipeUserIdToPrimaryUserIdMapping[recipeUserId],
                    description: "Recipe user is already linked with another primary user id",
                };
            }

            let user = await getUser({
                userId: recipeUserId,
            });

            if (user === undefined) {
                // QUESTION: should we throw an error here instead?
                return {
                    status: "OK",
                };
            }

            let usersForAccountInfo = [];

            let promises = [];

            for (let i = 0; i < user.emails.length; i++) {
                promises.push(
                    listUsersByAccountInfo({
                        info: {
                            email: user.emails[i],
                        },
                    })
                );
            }

            for (let i = 0; i < user.thirdpartyInfo.length; i++) {
                promises.push(
                    listUsersByAccountInfo({
                        info: {
                            ...user.thirdpartyInfo[i],
                        },
                    })
                );
            }

            for (let i = 0; i < user.phoneNumbers.length; i++) {
                promises.push(
                    listUsersByAccountInfo({
                        info: {
                            phoneNumber: user.phoneNumbers[i],
                        },
                    })
                );
            }

            for (let i = 0; i < promises.length; i++) {
                let result = await promises[i];
                if (result !== undefined) {
                    usersForAccountInfo.push(...result);
                }
            }

            let primaryUser = usersForAccountInfo.find((u) => u.isPrimaryUser);

            if (primaryUser !== undefined) {
                return {
                    status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                    primaryUserId: primaryUser.id,
                    description: "Account info related to recipe user is already linked with another primary user id",
                };
            }

            return {
                status: "OK",
            };
        },
        createPrimaryUser: async function ({
            recipeUserId,
        }: {
            recipeUserId: string;
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
            let canCreatePrimaryUser:
                | {
                      status: "OK";
                  }
                | {
                      status:
                          | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                          | "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                      primaryUserId: string;
                      description: string;
                  } = await this.canCreatePrimaryUserId({
                recipeUserId,
            });
            if (canCreatePrimaryUser.status !== "OK") {
                return canCreatePrimaryUser;
            }

            let primaryUser = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/accountlinking/user/primary"),
                {
                    recipeUserId,
                }
            );

            return primaryUser;
        },
        canLinkAccounts: async function ({
            recipeUserId,
            primaryUserId,
        }: {
            recipeUserId: string;
            primaryUserId: string;
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
            let primaryUser = await getUser({
                userId: primaryUserId,
            });
            if (primaryUser === undefined) {
                throw Error("primary user not found");
            }
            let recipeUser = await getUser({
                userId: recipeUserId,
            });
            if (recipeUser === undefined) {
                throw Error("recipe user not found");
            }
            let canCreatePrimaryUser:
                | {
                      status: "OK";
                  }
                | {
                      status:
                          | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                          | "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                      primaryUserId: string;
                      description: string;
                  } = await this.canCreatePrimaryUserId({
                recipeUserId,
            });
            if (canCreatePrimaryUser.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                if (canCreatePrimaryUser.primaryUserId === primaryUserId) {
                    return {
                        status: "ACCOUNTS_ALREADY_LINKED_ERROR",
                        description: "accounts are already linked",
                    };
                }
                return canCreatePrimaryUser;
            }
            if (canCreatePrimaryUser.status === "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                /**
                 * if canCreatePrimaryUser.status is
                 * ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR and
                 * canCreatePrimaryUser.primaryUserId is equal to the input primaryUserId,
                 * we don't return ACCOUNTS_ALREADY_LINKED_ERROR cause here the accounts
                 * are not yet linked. It's just that the identifyingInfo associated with the
                 * recipeUser is linked to the primaryUser. Input recipeUser still needs
                 * to be linked with the input primaryUserId
                 */
                if (canCreatePrimaryUser.primaryUserId !== primaryUserId) {
                    return canCreatePrimaryUser;
                }
            }
            return {
                status: "OK",
            };
        },
        linkAccounts: async function ({
            recipeUserId,
            primaryUserId,
            userContext,
        }: {
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
            let canLinkAccountsResult = await this.canLinkAccounts({
                recipeUserId,
                primaryUserId,
            });
            if (canLinkAccountsResult.status !== "OK") {
                return canLinkAccountsResult;
            }
            let accountsLinkingResult = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/accountlinking/user/link"),
                {
                    recipeUserId,
                    primaryUserId,
                }
            );
            if (accountsLinkingResult.status === "OK") {
                await Session.revokeAllSessionsForUser(recipeUserId, userContext);
                let user = await getUser({
                    userId: primaryUserId,
                });
                if (user === undefined) {
                    throw Error("this error should never be thrown");
                }
                let recipeUser = user.linkedRecipes.find((u) => u.recipeUserId === recipeUserId);
                if (recipeUser === undefined) {
                    throw Error("this error should never be thrown");
                }
                let recipeUserInfo = await Querier.getNewInstanceOrThrowError(recipeUser.recipeId).sendGetRequest(
                    new NormalisedURLPath("/recipe/user"),
                    {
                        userId: recipeUserId,
                    }
                );
                await config.onAccountLinked(user, recipeUserInfo.user, userContext);
            }
            return accountsLinkingResult;
        },
        unlinkAccounts: async function ({
            recipeUserId,
            userContext,
        }: {
            recipeUserId: string;
            userContext: any;
        }): Promise<{
            status: "OK";
            wasRecipeUserDeleted: boolean;
        }> {
            let recipeUserIdToPrimaryUserIdMapping = await this.getPrimaryUserIdsforRecipeUserIds({
                recipeUserIds: [recipeUserId],
            });
            if (
                recipeUserIdToPrimaryUserIdMapping[recipeUserId] === undefined ||
                recipeUserIdToPrimaryUserIdMapping[recipeUserId] === null
            ) {
                return {
                    status: "OK",
                    wasRecipeUserDeleted: false,
                };
            }
            let primaryUserId = recipeUserIdToPrimaryUserIdMapping[recipeUserId];
            let user = await getUser({
                userId: primaryUserId,
            });
            if (user === undefined) {
                throw Error("this error should never be thrown");
            }
            let recipeUser = user.linkedRecipes.find((u) => u.recipeUserId === recipeUserId);
            if (recipeUser === undefined) {
                throw Error("this error should never be thrown");
            }
            let recipeUserInfo = await Querier.getNewInstanceOrThrowError(recipeUser.recipeId).sendGetRequest(
                new NormalisedURLPath("/recipe/user"),
                {
                    userId: recipeUserId,
                }
            );
            /**
             * primaryUserId === recipeUserId
             */
            if (primaryUserId === recipeUserId) {
                let user = await getUser({
                    userId: primaryUserId,
                });

                if (user === undefined) {
                    return {
                        status: "OK",
                        wasRecipeUserDeleted: false,
                    };
                }
                if (user.linkedRecipes.length > 1) {
                    await deleteUser(recipeUserId, false);
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

            await config.onAccountUnlinked(user, recipeUserInfo.user, userContext);
            return {
                status: "OK",
                wasRecipeUserDeleted: false,
            };
        },
    };
}
