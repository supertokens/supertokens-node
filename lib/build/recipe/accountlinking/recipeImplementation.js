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
Object.defineProperty(exports, "__esModule", { value: true });
const querier_1 = require("../../querier");
const normalisedURLPath_1 = require("../../normalisedURLPath");
const utils_1 = require("../../utils");
const __1 = require("../../");
const session_1 = require("../session");
function getRecipeImplementation(querier, config) {
    return {
        getRecipeUserIdsForPrimaryUserIds: function ({ primaryUserIds }) {
            return __awaiter(this, void 0, void 0, function* () {
                return querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/accountlinking/users"), {
                    primaryUserIds: primaryUserIds.join(","),
                });
            });
        },
        getPrimaryUserIdsforRecipeUserIds: function ({ recipeUserIds }) {
            return __awaiter(this, void 0, void 0, function* () {
                return querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/accountlinking/users"), {
                    recipeUserIds: recipeUserIds.join(","),
                });
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
                let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
                let apiVersion = yield querier.getAPIVersion();
                if (utils_1.maxVersion(apiVersion, "2.7") === "2.7") {
                    throw new Error(
                        "Please use core version >= 3.5 to call this function. Otherwise, you can call <YourRecipe>.getUsersOldestFirst() or <YourRecipe>.getUsersNewestFirst() instead (for example, EmailPassword.getUsersOldestFirst())"
                    );
                }
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
        canCreatePrimaryUserId: function ({ recipeUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let recipeUserIdToPrimaryUserIdMapping = yield this.getPrimaryUserIdsforRecipeUserIds({
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
                let user = yield __1.getUser({
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
                        __1.listUsersByAccountInfo({
                            info: {
                                email: user.emails[i],
                            },
                        })
                    );
                }
                for (let i = 0; i < user.thirdpartyInfo.length; i++) {
                    promises.push(
                        __1.listUsersByAccountInfo({
                            info: Object.assign({}, user.thirdpartyInfo[i]),
                        })
                    );
                }
                for (let i = 0; i < user.phoneNumbers.length; i++) {
                    promises.push(
                        __1.listUsersByAccountInfo({
                            info: {
                                phoneNumber: user.phoneNumbers[i],
                            },
                        })
                    );
                }
                for (let i = 0; i < promises.length; i++) {
                    let result = yield promises[i];
                    if (result !== undefined) {
                        usersForAccountInfo.push(...result);
                    }
                }
                let primaryUser = usersForAccountInfo.find((u) => u.isPrimaryUser);
                if (primaryUser !== undefined) {
                    return {
                        status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        primaryUserId: primaryUser.id,
                        description:
                            "Account info related to recipe user is already linked with another primary user id",
                    };
                }
                return {
                    status: "OK",
                };
            });
        },
        createPrimaryUser: function ({ recipeUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let canCreatePrimaryUser = yield this.canCreatePrimaryUserId({
                    recipeUserId,
                });
                if (canCreatePrimaryUser.status !== "OK") {
                    return canCreatePrimaryUser;
                }
                let primaryUser = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/primary"),
                    {
                        recipeUserId,
                    }
                );
                return primaryUser;
            });
        },
        canLinkAccounts: function ({ recipeUserId, primaryUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let primaryUser = yield __1.getUser({
                    userId: primaryUserId,
                });
                if (primaryUser === undefined) {
                    throw Error("primary user not found");
                }
                let recipeUser = yield __1.getUser({
                    userId: recipeUserId,
                });
                if (recipeUser === undefined) {
                    throw Error("recipe user not found");
                }
                let canCreatePrimaryUser = yield this.canCreatePrimaryUserId({
                    recipeUserId,
                });
                if (
                    canCreatePrimaryUser.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                ) {
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
            });
        },
        linkAccounts: function ({ recipeUserId, primaryUserId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let canLinkAccountsResult = yield this.canLinkAccounts({
                    recipeUserId,
                    primaryUserId,
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
                    let user = yield __1.getUser({
                        userId: primaryUserId,
                    });
                    if (user === undefined) {
                        throw Error("this error should never be thrown");
                    }
                    let recipeUser = user.linkedRecipes.find((u) => u.recipeUserId === recipeUserId);
                    if (recipeUser === undefined) {
                        throw Error("this error should never be thrown");
                    }
                    let recipeUserInfo = yield querier_1.Querier.getNewInstanceOrThrowError(
                        recipeUser.recipeId
                    ).sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                        userId: recipeUserId,
                    });
                    yield config.onAccountLinked(user, recipeUserInfo.user, userContext);
                }
                return accountsLinkingResult;
            });
        },
        unlinkAccounts: function ({ recipeUserId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let recipeUserIdToPrimaryUserIdMapping = yield this.getPrimaryUserIdsforRecipeUserIds({
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
                let user = yield __1.getUser({
                    userId: primaryUserId,
                });
                if (user === undefined) {
                    throw Error("this error should never be thrown");
                }
                let recipeUser = user.linkedRecipes.find((u) => u.recipeUserId === recipeUserId);
                if (recipeUser === undefined) {
                    throw Error("this error should never be thrown");
                }
                let recipeUserInfo = yield querier_1.Querier.getNewInstanceOrThrowError(
                    recipeUser.recipeId
                ).sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId: recipeUserId,
                });
                /**
                 * primaryUserId === recipeUserId
                 */
                if (primaryUserId === recipeUserId) {
                    let user = yield __1.getUser({
                        userId: primaryUserId,
                    });
                    if (user === undefined) {
                        return {
                            status: "OK",
                            wasRecipeUserDeleted: false,
                        };
                    }
                    if (user.linkedRecipes.length > 1) {
                        yield __1.deleteUser(recipeUserId, false);
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
                }
                yield config.onAccountUnlinked(user, recipeUserInfo.user, userContext);
                return {
                    status: "OK",
                    wasRecipeUserDeleted: false,
                };
            });
        },
    };
}
exports.default = getRecipeImplementation;
