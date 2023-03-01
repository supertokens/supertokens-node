"use strict";
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
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const session_1 = __importDefault(require("../session"));
function getRecipeImplementation(querier, config) {
    return {
        getRecipeUserIdsForPrimaryUserIds: function ({ primaryUserIds }) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/users"),
                    {
                        primaryUserIds: primaryUserIds.join(","),
                    }
                );
                return result.userIdMapping;
            });
        },
        getPrimaryUserIdsForRecipeUserIds: function ({ recipeUserIds }) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/users"),
                    {
                        recipeUserIds: recipeUserIds.join(","),
                    }
                );
                return result.userIdMapping;
            });
        },
        addNewRecipeUserIdWithoutPrimaryUserId: function ({ recipeUserId, recipeId, timeJoined }) {
            return __awaiter(this, void 0, void 0, function* () {
                return querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/accountlinking/user"), {
                    recipeUserId,
                    recipeId,
                    timeJoined,
                });
            });
        },
        getUsers: function ({ timeJoinedOrder, limit, paginationToken, includeRecipeIds }) {
            return __awaiter(this, void 0, void 0, function* () {
                let includeRecipeIdsStr = undefined;
                if (includeRecipeIds !== undefined) {
                    includeRecipeIdsStr = includeRecipeIds.join(",");
                }
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/users"), {
                    includeRecipeIds: includeRecipeIdsStr,
                    timeJoinedOrder: timeJoinedOrder,
                    limit: limit,
                    paginationToken: paginationToken,
                });
                return {
                    users: response.users,
                    nextPaginationToken: response.nextPaginationToken,
                };
            });
        },
        canCreatePrimaryUserId: function ({ recipeUserId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                /**
                 * getting map of recipeUserIds to primaryUserIds
                 * This is to know if the existing recipeUserId
                 * is already associated with a primaryUserId
                 */
                let recipeUserIdToPrimaryUserIdMapping = yield this.getPrimaryUserIdsForRecipeUserIds({
                    recipeUserIds: [recipeUserId],
                    userContext,
                });
                /**
                 * checking if primaryUserId exists for the recipeUserId
                 */
                let primaryUserId = recipeUserIdToPrimaryUserIdMapping[recipeUserId];
                if (primaryUserId === undefined) {
                    // this means that the recipeUserId doesn't exist
                    throw new Error("The input recipeUserId does not exist");
                }
                if (primaryUserId !== null) {
                    return {
                        status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR",
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
                let user = yield this.getUser({
                    userId: recipeUserId,
                    userContext,
                });
                /**
                 * precautionary check
                 */
                if (user === undefined) {
                    throw new Error("The input recipeUserId does not exist");
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
                    let infos = [];
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
                            thirdPartyId: loginMethod.thirdParty.id,
                            thirdPartyUserId: loginMethod.thirdParty.userId,
                        });
                    }
                    for (let j = 0; j < infos.length; j++) {
                        let info = infos[j];
                        let usersList = yield this.listUsersByAccountInfo({
                            accountInfo: info,
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
                        description:
                            "Account info related to recipe user is already linked with another primary user id",
                    };
                }
                /**
                 * no primaryUser found for either recipeUserId or
                 * the identiyfing info asscociated with the recipeUser
                 */
                return {
                    status: "OK",
                };
            });
        },
        createPrimaryUser: function ({ recipeUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let primaryUser = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/primary"),
                    {
                        recipeUserId,
                    }
                );
                if (!primaryUser.user.isPrimaryUser) {
                    throw Error("creating primaryUser for recipeUser failed in core");
                }
                return primaryUser;
            });
        },
        canLinkAccounts: function ({ recipeUserId, primaryUserId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let primaryUser = yield this.getUser({
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
                let recipeUser = yield this.getUser({
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
                let canCreatePrimaryUser = yield this.canCreatePrimaryUserId({
                    recipeUserId,
                    userContext,
                });
                if (canCreatePrimaryUser.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                    if (canCreatePrimaryUser.primaryUserId === primaryUserId) {
                        return {
                            status: "ACCOUNTS_ALREADY_LINKED_ERROR",
                            description: "accounts are already linked",
                        };
                    }
                    return {
                        status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        primaryUserId: canCreatePrimaryUser.primaryUserId,
                        description: canCreatePrimaryUser.description,
                    };
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
                        return {
                            status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                            description: canCreatePrimaryUser.description,
                            primaryUserId: canCreatePrimaryUser.primaryUserId,
                        };
                    }
                }
                return {
                    status: "OK",
                };
            });
        },
        linkAccounts: function ({ recipeUserId, primaryUserId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let canLinkAccountsResult = yield this.canLinkAccounts({
                    recipeUserId,
                    primaryUserId,
                    userContext,
                });
                if (canLinkAccountsResult.status !== "OK") {
                    return canLinkAccountsResult;
                }
                let accountsLinkingResult = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/link"),
                    {
                        recipeUserId,
                        primaryUserId,
                    }
                );
                if (accountsLinkingResult.status === "OK") {
                    yield session_1.default.revokeAllSessionsForUser(recipeUserId, userContext);
                    let user = yield this.getUser({
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
                    yield config.onAccountLinked(
                        user,
                        {
                            recipeId: loginMethodInfo.recipeId,
                            recipeUserId: loginMethodInfo.recipeUserId,
                            timeJoined: loginMethodInfo.timeJoined,
                            email: loginMethodInfo.email,
                            phoneNumber: loginMethodInfo.phoneNumber,
                            thirdParty: loginMethodInfo.thirdParty,
                        },
                        userContext
                    );
                } else {
                    throw Error(`error thrown from core while linking accounts: ${accountsLinkingResult.status}`);
                }
                return accountsLinkingResult;
            });
        },
        unlinkAccounts: function ({ recipeUserId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let recipeUserIdToPrimaryUserIdMapping = yield this.getPrimaryUserIdsForRecipeUserIds({
                    recipeUserIds: [recipeUserId],
                    userContext,
                });
                let primaryUserId = recipeUserIdToPrimaryUserIdMapping[recipeUserId];
                if (primaryUserId === undefined) {
                    throw new Error("input recipeUserId does not exist");
                }
                if (primaryUserId === null) {
                    throw Error("recipeUserId is not associated with any primaryUserId");
                }
                /**
                 * primaryUserId === recipeUserId
                 */
                if (primaryUserId === recipeUserId) {
                    let user = yield this.getUser({
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
                        yield this.deleteUser({
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
                let accountsUnlinkingResult = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/unlink"),
                    {
                        recipeUserId,
                        primaryUserId,
                    }
                );
                if (accountsUnlinkingResult.status === "OK") {
                    yield session_1.default.revokeAllSessionsForUser(recipeUserId, userContext);
                } else {
                    throw Error(`error thrown from core while unlinking accounts: ${accountsUnlinkingResult.status}`);
                }
                return {
                    status: "OK",
                    wasRecipeUserDeleted: false,
                };
            });
        },
        getUser: function ({ userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user"),
                    {
                        userId,
                    }
                );
                if (result.status === "OK") {
                    return result.user;
                }
                return undefined;
            });
        },
        listUsersByAccountInfo: function ({ accountInfo }) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/users/accountinfo"),
                    Object.assign({}, accountInfo)
                );
                return result.users;
            });
        },
        deleteUser: function ({ userId, removeAllLinkedAccounts, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let user = yield this.getUser({ userId, userContext });
                if (user === undefined) {
                    return {
                        status: "OK",
                    };
                }
                let recipeUsersToRemove = [];
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
                    yield querier.sendPostRequest(new normalisedURLPath_1.default("/user/remove"), {
                        userId: recipeUsersToRemove[i].recipeUserId,
                    });
                }
                return {
                    status: "OK",
                };
            });
        },
        fetchFromAccountToLinkTable: function ({ recipeUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/link/table"),
                    {
                        recipeUserId,
                    }
                );
                return result.user;
            });
        },
        storeIntoAccountToLinkTable: function ({ recipeUserId, primaryUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/link/table"),
                    {
                        recipeUserId,
                        primaryUserId,
                    }
                );
                return result;
            });
        },
    };
}
exports.default = getRecipeImplementation;
