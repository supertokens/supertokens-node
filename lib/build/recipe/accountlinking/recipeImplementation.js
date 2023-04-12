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
        canCreatePrimaryUserId: function ({ recipeUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/primary/check"),
                    {
                        recipeUserId,
                    }
                );
                return result;
            });
        },
        createPrimaryUser: function ({ recipeUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/primary"),
                    {
                        recipeUserId,
                    }
                );
                return result;
            });
        },
        canLinkAccounts: function ({ recipeUserId, primaryUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/link/check"),
                    {
                        recipeUserId,
                        primaryUserId,
                    }
                );
                if (result.status === "OK") {
                    return {
                        status: "OK",
                        accountsAlreadyLinked: false,
                    };
                }
                if (result.status === "ACCOUNTS_ALREADY_LINKED_ERROR") {
                    return {
                        status: "OK",
                        accountsAlreadyLinked: true,
                    };
                }
                return result;
            });
        },
        linkAccounts: function ({ recipeUserId, primaryUserId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
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
                    return {
                        status: "OK",
                        accountsAlreadyLinked: false,
                    };
                } else if (accountsLinkingResult.status === "ACCOUNTS_ALREADY_LINKED_ERROR") {
                    let user = yield this.getUser({
                        userId: primaryUserId,
                        userContext,
                    });
                    if (user === undefined) {
                        throw Error("this error should never be thrown");
                    }
                    return {
                        status: "OK",
                        accountsAlreadyLinked: true,
                    };
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
                        throw new Error("Seems like a race condition issue occurred. Please try again");
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
        deleteUser: function ({ userId, removeAllLinkedAccounts }) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield querier.sendPostRequest(new normalisedURLPath_1.default("/user/remove"), {
                    userId,
                    removeAllLinkedAccounts,
                });
                return result;
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
