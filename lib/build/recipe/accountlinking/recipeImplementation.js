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
const mockCore_1 = require("./mockCore");
function getRecipeImplementation(querier, config) {
    return {
        getUsers: function ({ timeJoinedOrder, limit, paginationToken, includeRecipeIds, query }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.TEST_MODE !== "testing") {
                    let includeRecipeIdsStr = undefined;
                    if (includeRecipeIds !== undefined) {
                        includeRecipeIdsStr = includeRecipeIds.join(",");
                    }
                    let response = yield querier.sendGetRequest(
                        new normalisedURLPath_1.default("/users"),
                        Object.assign(
                            {
                                includeRecipeIds: includeRecipeIdsStr,
                                timeJoinedOrder: timeJoinedOrder,
                                limit: limit,
                                paginationToken: paginationToken,
                            },
                            query
                        )
                    );
                    return {
                        users: response.users,
                        nextPaginationToken: response.nextPaginationToken,
                    };
                } else {
                    return yield mockCore_1.mockGetUsers(querier, {
                        timeJoinedOrder,
                        limit,
                        paginationToken,
                        includeRecipeIds,
                        query,
                    });
                }
            });
        },
        canCreatePrimaryUserId: function ({ recipeUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
                    return yield querier.sendGetRequest(
                        new normalisedURLPath_1.default("/recipe/accountlinking/user/primary/check"),
                        {
                            recipeUserId,
                        }
                    );
                } else {
                    return yield mockCore_1.mockCanCreatePrimaryUser(recipeUserId);
                }
            });
        },
        createPrimaryUser: function ({ recipeUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
                    let response = yield querier.sendPostRequest(
                        new normalisedURLPath_1.default("/recipe/accountlinking/user/primary"),
                        {
                            recipeUserId,
                        }
                    );
                    return response;
                } else {
                    return yield mockCore_1.mockCreatePrimaryUser(recipeUserId);
                }
            });
        },
        canLinkAccounts: function ({ recipeUserId, primaryUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
                    let result = yield querier.sendGetRequest(
                        new normalisedURLPath_1.default("/recipe/accountlinking/user/link/check"),
                        {
                            recipeUserId,
                            primaryUserId,
                        }
                    );
                    return result;
                } else {
                    return yield mockCore_1.mockCanLinkAccounts({ recipeUserId, primaryUserId });
                }
            });
        },
        linkAccounts: function ({ recipeUserId, primaryUserId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let accountsLinkingResult;
                if (process.env.MOCK !== "true") {
                    accountsLinkingResult = yield querier.sendPostRequest(
                        new normalisedURLPath_1.default("/recipe/accountlinking/user/link"),
                        {
                            recipeUserId,
                            primaryUserId,
                        }
                    );
                } else {
                    accountsLinkingResult = yield mockCore_1.mockLinkAccounts({ recipeUserId, primaryUserId });
                }
                if (accountsLinkingResult.status === "OK" && !accountsLinkingResult.accountsAlreadyLinked) {
                    yield session_1.default.revokeAllSessionsForUser(recipeUserId.getAsString(), false, userContext);
                    let user = yield this.getUser({
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
                    yield config.onAccountLinked(user, loginMethodInfo, userContext);
                }
                return accountsLinkingResult;
            });
        },
        unlinkAccounts: function ({ recipeUserId, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let accountsUnlinkingResult = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/unlink"),
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
                    yield session_1.default.revokeAllSessionsForUser(recipeUserId.getAsString(), false, userContext);
                }
                return accountsUnlinkingResult;
            });
        },
        getUser: function ({ userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
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
                } else {
                    return mockCore_1.mockGetUser({ userId });
                }
            });
        },
        listUsersByAccountInfo: function ({ accountInfo }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
                    let result = yield querier.sendGetRequest(
                        new normalisedURLPath_1.default("/users/accountinfo"),
                        Object.assign({}, accountInfo)
                    );
                    return result.users;
                } else {
                    return mockCore_1.mockListUsersByAccountInfo({ accountInfo });
                }
            });
        },
        deleteUser: function ({ userId, removeAllLinkedAccounts }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield querier.sendPostRequest(new normalisedURLPath_1.default("/user/remove"), {
                    userId,
                    removeAllLinkedAccounts,
                });
            });
        },
        fetchFromAccountToLinkTable: function ({ recipeUserId }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
                    let result = yield querier.sendGetRequest(
                        new normalisedURLPath_1.default("/recipe/accountlinking/user/link/table"),
                        {
                            recipeUserId,
                        }
                    );
                    return result.user;
                } else {
                    return mockCore_1.mockFetchFromAccountToLinkTable({ recipeUserId });
                }
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
