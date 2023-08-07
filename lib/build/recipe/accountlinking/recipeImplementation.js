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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const mockCore_1 = require("./mockCore");
const user_1 = require("../../user");
function getRecipeImplementation(querier, config, recipeInstance) {
    return {
        getUsers: async function ({ timeJoinedOrder, limit, paginationToken, includeRecipeIds, query }) {
            if (process.env.MOCK !== "true") {
                let includeRecipeIdsStr = undefined;
                if (includeRecipeIds !== undefined) {
                    includeRecipeIdsStr = includeRecipeIds.join(",");
                }
                let response = await querier.sendGetRequest(
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
                    users: response.users.map((u) => new user_1.User(u)),
                    nextPaginationToken: response.nextPaginationToken,
                };
            } else {
                return await mockCore_1.mockGetUsers(querier, {
                    timeJoinedOrder,
                    limit,
                    paginationToken,
                    includeRecipeIds,
                    query,
                });
            }
        },
        canCreatePrimaryUser: async function ({ recipeUserId }) {
            if (process.env.MOCK !== "true") {
                return await querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/primary/check"),
                    {
                        recipeUserId: recipeUserId.getAsString(),
                    }
                );
            } else {
                return await mockCore_1.mockCanCreatePrimaryUser(recipeUserId);
            }
        },
        createPrimaryUser: async function ({ recipeUserId }) {
            if (process.env.MOCK !== "true") {
                let response = await querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/primary"),
                    {
                        recipeUserId: recipeUserId.getAsString(),
                    }
                );
                if (response.status === "OK") {
                    response.user = new user_1.User(response.user);
                }
                return response;
            } else {
                return await mockCore_1.mockCreatePrimaryUser(recipeUserId);
            }
        },
        canLinkAccounts: async function ({ recipeUserId, primaryUserId }) {
            if (process.env.MOCK !== "true") {
                let result = await querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/link/check"),
                    {
                        recipeUserId: recipeUserId.getAsString(),
                        primaryUserId,
                    }
                );
                return result;
            } else {
                return await mockCore_1.mockCanLinkAccounts({ recipeUserId, primaryUserId });
            }
        },
        linkAccounts: async function ({ tenantId, recipeUserId, primaryUserId, userContext }) {
            let accountsLinkingResult;
            if (process.env.MOCK !== "true") {
                accountsLinkingResult = await querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/link"),
                    {
                        recipeUserId: recipeUserId.getAsString(),
                        primaryUserId,
                    }
                );
            } else {
                accountsLinkingResult = await mockCore_1.mockLinkAccounts({ recipeUserId, primaryUserId });
            }
            if (accountsLinkingResult.status === "OK" && !accountsLinkingResult.accountsAlreadyLinked) {
                await recipeInstance.verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    tenantId,
                    recipeUserId,
                    userContext,
                });
                let user = await this.getUser({
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
                await config.onAccountLinked(user, loginMethodInfo, userContext);
            }
            return accountsLinkingResult;
        },
        unlinkAccount: async function ({ recipeUserId }) {
            if (process.env.MOCK !== "true") {
                let accountsUnlinkingResult = await querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/accountlinking/user/unlink"),
                    {
                        recipeUserId: recipeUserId.getAsString(),
                    }
                );
                return accountsUnlinkingResult;
            } else {
                return await mockCore_1.mockUnlinkAccount({ recipeUserId, querier });
            }
        },
        getUser: async function ({ userId }) {
            console.log("userId in account ===", userId);
            if (process.env.MOCK !== "true") {
                let result = await querier.sendGetRequest(new normalisedURLPath_1.default("/user/id"), {
                    userId,
                });
                if (result.status === "OK") {
                    return new user_1.User(result.user);
                }
                return undefined;
            } else {
                return mockCore_1.mockGetUser({ userId });
            }
        },
        listUsersByAccountInfo: async function ({ accountInfo, doUnionOfAccountInfo }) {
            var _a, _b;
            if (process.env.MOCK !== "true") {
                let result = await querier.sendGetRequest(new normalisedURLPath_1.default("/users/by-accountinfo"), {
                    email: accountInfo.email,
                    phoneNumber: accountInfo.phoneNumber,
                    thirdPartyId: (_a = accountInfo.thirdParty) === null || _a === void 0 ? void 0 : _a.id,
                    thirdPartyUserId: (_b = accountInfo.thirdParty) === null || _b === void 0 ? void 0 : _b.userId,
                    doUnionOfAccountInfo,
                });
                return result.users.map((u) => new user_1.User(u));
            } else {
                return mockCore_1.mockListUsersByAccountInfo({ accountInfo, doUnionOfAccountInfo });
            }
        },
        deleteUser: async function ({ userId, removeAllLinkedAccounts }) {
            if (process.env.MOCK !== "true") {
                return await querier.sendPostRequest(new normalisedURLPath_1.default("/user/remove"), {
                    userId,
                    removeAllLinkedAccounts,
                });
            } else {
                return await mockCore_1.mockDeleteUser({ userId, removeAllLinkedAccounts, querier });
            }
        },
    };
}
exports.default = getRecipeImplementation;
