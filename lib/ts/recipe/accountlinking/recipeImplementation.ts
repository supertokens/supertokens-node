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

import { AccountInfo, AccountInfoWithRecipeId, RecipeInterface, TypeNormalisedInput } from "./types";
import { Querier } from "../../querier";
import type { User } from "../../types";
import NormalisedURLPath from "../../normalisedURLPath";
import Session from "../session";
import { getUserForRecipeId } from "../..";

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
        getPrimaryUserIdsforRecipeUserIds: async function (
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
                recipeId: string;
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
                userContext,
            }: {
                recipeUserId: string;
                userContext: any;
            }
        ): Promise<
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
            /**
             * getting map of recipeUserIds to primaryUserIds
             * This is to know if the existing recipeUserId
             * is already associated with a primaryUserId
             */
            let recipeUserIdToPrimaryUserIdMapping = await this.getPrimaryUserIdsforRecipeUserIds({
                recipeUserIds: [recipeUserId],
                userContext,
            });

            /**
             * checking if primaryUserId exists for the recipeUserId
             */
            let primaryUserId = recipeUserIdToPrimaryUserIdMapping[recipeUserId];
            if (primaryUserId !== undefined && primaryUserId !== null) {
                return {
                    status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                    primaryUserId,
                    description: "Recipe user is already linked with another primary user id",
                };
            }

            /**
             * if the code reaches this point, it means
             * the recipeuserId is definitely not associated
             * with any primaryUserId. So the getUser function
             * here will return an user object which would
             * definitely be a recipeUser only.
             */
            let user = await this.getUser({
                userId: recipeUserId,
                userContext,
            });

            /**
             * precautionary check
             */
            if (user === undefined) {
                throw Error("this error should not be thrown");
            }

            /**
             * for all the identifying info associated with the recipeUser,
             * we get all the accounts with those identifying infos.
             * From those users, we'll try to find if there already exists
             * a primaryUser which is associated with the identifying info
             */
            let usersForAccountInfo = [];

            for (let i = 0; i < user.loginMethods.length; i++) {
                let loginMethod = user.loginMethods[i];
                let infos: AccountInfo[] = [];
                if (loginMethod.email !== undefined) {
                    infos.push({
                        email: loginMethod.email,
                    });
                }
                if (loginMethod.phoneNumber !== undefined) {
                    infos.push({
                        phoneNumber: loginMethod.phoneNumber,
                    });
                }
                if (loginMethod.thirdParty !== undefined) {
                    infos.push({
                        thirdpartyId: loginMethod.thirdParty.id,
                        thirdpartyUserId: loginMethod.thirdParty.userId,
                    });
                }
                for (let j = 0; j < infos.length; j++) {
                    let info = infos[j];
                    let usersList = await this.listUsersByAccountInfo({
                        info,
                        userContext,
                    });
                    if (usersList !== undefined) {
                        usersForAccountInfo.push(...usersList);
                    }
                }
            }

            let primaryUser = usersForAccountInfo.find((u) => u.isPrimaryUser);

            /**
             * checking if primaryUserId exists for the account identifying info
             */
            if (primaryUser !== undefined) {
                return {
                    status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                    primaryUserId: primaryUser.id,
                    description: "Account info related to recipe user is already linked with another primary user id",
                };
            }

            /**
             * no primaryUser found for either recipeUserId or
             * the identiyfing info asscociated with the recipeUser
             */
            return {
                status: "OK",
            };
        },
        createPrimaryUser: async function (
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
                userContext,
            });
            if (canCreatePrimaryUser.status !== "OK") {
                return canCreatePrimaryUser;
            }

            let primaryUser: {
                status: "OK";
                user: User;
            } = await querier.sendPostRequest(new NormalisedURLPath("/recipe/accountlinking/user/primary"), {
                recipeUserId,
            });

            if (!primaryUser.user.isPrimaryUser) {
                throw Error("creating primaryUser for recipeUser failed in core");
            }
            return primaryUser;
        },
        canLinkAccounts: async function (
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
            let primaryUser: User | undefined = await this.getUser({
                userId: primaryUserId,
                userContext,
            });
            if (primaryUser === undefined) {
                throw Error("primary user not found");
            }
            /**
             * getUser function returns a primaryUser even if
             * recipeUserId is passed, if the recipeUserId has
             * an associated primaryUserId. Here, after calling
             * getUser for the recipeUser, we will check if there
             * is already a primaryUser associated with it. If
             * there is, we'll check if there exists if it's the
             * input primaryUserId or some different primaryUserId
             */
            let recipeUser: User | undefined = await this.getUser({
                userId: recipeUserId,
                userContext,
            });
            if (recipeUser === undefined) {
                throw Error("recipe user not found");
            }
            if (recipeUser.isPrimaryUser) {
                if (recipeUser.id === primaryUserId) {
                    return {
                        status: "ACCOUNTS_ALREADY_LINKED_ERROR",
                        description: "accounts are already linked",
                    };
                }
                return {
                    status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                    description: "recipeUserId already associated with another primaryUserId",
                    primaryUserId: recipeUser.id, // this is actually the primary user ID cause isPrimaryUser is true
                };
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
                userContext,
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
            let canLinkAccountsResult:
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
                  } = await this.canLinkAccounts({
                recipeUserId,
                primaryUserId,
                userContext,
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
                let recipeUser = await getUserForRecipeId(loginMethodInfo.recipeUserId, loginMethodInfo.recipeId);
                if (recipeUser.user === undefined) {
                    throw Error("this error should never be thrown");
                }
                await config.onAccountLinked(user, recipeUser.user, userContext);
            } else {
                throw Error(`error thrown from core while linking accounts: ${accountsLinkingResult.status}`);
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
        ): Promise<{
            status: "OK";
            wasRecipeUserDeleted: boolean;
        }> {
            let recipeUserIdToPrimaryUserIdMapping = await this.getPrimaryUserIdsforRecipeUserIds({
                recipeUserIds: [recipeUserId],
                userContext,
            });
            let primaryUserId = recipeUserIdToPrimaryUserIdMapping[recipeUserId];
            if (primaryUserId === undefined || primaryUserId === null) {
                throw Error("recipeUserId is not associated with any primaryUserId");
            }
            /**
             * primaryUserId === recipeUserId
             */
            if (primaryUserId === recipeUserId) {
                let user = await this.getUser({
                    userId: primaryUserId,
                    userContext,
                });

                if (user === undefined) {
                    return {
                        status: "OK",
                        wasRecipeUserDeleted: false,
                    };
                }
                if (user.loginMethods.length > 1) {
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
            } else {
                throw Error(`error thrown from core while unlinking accounts: ${accountsUnlinkingResult.status}`);
            }

            return {
                status: "OK",
                wasRecipeUserDeleted: false,
            };
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
            { info }: { info: AccountInfo }
        ): Promise<User[] | undefined> {
            let result = await querier.sendGetRequest(new NormalisedURLPath("/users/accountinfo"), {
                ...info,
            });
            if (result.status === "OK") {
                return result.users;
            }
            return undefined;
        },
        getUserByAccountInfo: async function (
            this: RecipeInterface,
            { info }: { info: AccountInfoWithRecipeId }
        ): Promise<User | undefined> {
            let result = await querier.sendGetRequest(new NormalisedURLPath("/users/accountinfo"), {
                ...info,
            });
            if (result.status === "OK") {
                return result.users[0];
            }
            return undefined;
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
                userContext: any;
            }
        ): Promise<{
            status: "OK";
        }> {
            let user: User | undefined = await this.getUser({ userId, userContext });

            if (user === undefined) {
                return {
                    status: "OK",
                };
            }

            let recipeUsersToRemove: {
                recipeId: string;
                recipeUserId: string;
            }[] = [];

            /**
             * if true, the user should be treated as primaryUser
             */
            if (removeAllLinkedAccounts) {
                recipeUsersToRemove = user.loginMethods;
            } else {
                recipeUsersToRemove = user.loginMethods.filter((u) => u.recipeUserId === userId);
            }

            for (let i = 0; i < recipeUsersToRemove.length; i++) {
                /**
                 * - the core will also remove any primary userId association, if exists
                 * - while removing the primary userId association, if there exists no
                 *   other recipe user associated with the primary user, the core will
                 *   also remove all data linked to the primary user in other non-auth tables
                 */
                await querier.sendPostRequest(new NormalisedURLPath("/user/remove"), {
                    userId: recipeUsersToRemove[i].recipeUserId,
                });
            }
            return {
                status: "OK",
            };
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
        }): Promise<{ status: "OK" }> {
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
