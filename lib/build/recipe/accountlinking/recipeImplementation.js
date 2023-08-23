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
const user_1 = require("../../user");
function getRecipeImplementation(querier, config, recipeInstance) {
    return {
        getUsers: async function ({ timeJoinedOrder, limit, paginationToken, includeRecipeIds, query }) {
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
        },
        canCreatePrimaryUser: async function ({ recipeUserId }) {
            return await querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/accountlinking/user/primary/check"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                }
            );
        },
        createPrimaryUser: async function ({ recipeUserId }) {
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
        },
        canLinkAccounts: async function ({ recipeUserId, primaryUserId }) {
            let result = await querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/accountlinking/user/link/check"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                    primaryUserId,
                }
            );
            return result;
        },
        linkAccounts: async function ({ tenantId, recipeUserId, primaryUserId, userContext }) {
            const accountsLinkingResult = await querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/accountlinking/user/link"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                    primaryUserId,
                }
            );
            if (
                ["OK", "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"].includes(
                    accountsLinkingResult.user
                )
            ) {
                accountsLinkingResult.user = new user_1.User(accountsLinkingResult.user);
            }
            if (accountsLinkingResult.status === "OK") {
                let user = accountsLinkingResult.user;
                if (!accountsLinkingResult.accountsAlreadyLinked) {
                    await recipeInstance.verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                        tenantId,
                        user: user,
                        recipeUserId,
                        userContext,
                    });
                    const updatedUser = await this.getUser({
                        userId: primaryUserId,
                        userContext,
                    });
                    if (updatedUser === undefined) {
                        throw Error("this error should never be thrown");
                    }
                    user = updatedUser;
                    let loginMethodInfo = user.loginMethods.find(
                        (u) => u.recipeUserId.getAsString() === recipeUserId.getAsString()
                    );
                    if (loginMethodInfo === undefined) {
                        throw Error("this error should never be thrown");
                    }
                    await config.onAccountLinked(user, loginMethodInfo, tenantId, userContext);
                }
                accountsLinkingResult.user = user;
            }
            return accountsLinkingResult;
        },
        unlinkAccount: async function ({ recipeUserId }) {
            let accountsUnlinkingResult = await querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/accountlinking/user/unlink"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                }
            );
            return accountsUnlinkingResult;
        },
        getUser: async function ({ userId }) {
            let result = await querier.sendGetRequest(new normalisedURLPath_1.default("/user/id"), {
                userId,
            });
            if (result.status === "OK") {
                return new user_1.User(result.user);
            }
            return undefined;
        },
        listUsersByAccountInfo: async function ({ tenantId, accountInfo, doUnionOfAccountInfo }) {
            var _a, _b;
            let result = await querier.sendGetRequest(
                new normalisedURLPath_1.default(
                    `${tenantId !== null && tenantId !== void 0 ? tenantId : "public"}/users/by-accountinfo`
                ),
                {
                    email: accountInfo.email,
                    phoneNumber: accountInfo.phoneNumber,
                    thirdPartyId: (_a = accountInfo.thirdParty) === null || _a === void 0 ? void 0 : _a.id,
                    thirdPartyUserId: (_b = accountInfo.thirdParty) === null || _b === void 0 ? void 0 : _b.userId,
                    doUnionOfAccountInfo,
                }
            );
            return result.users.map((u) => new user_1.User(u));
        },
        deleteUser: async function ({ userId, removeAllLinkedAccounts }) {
            return await querier.sendPostRequest(new normalisedURLPath_1.default("/user/remove"), {
                userId,
                removeAllLinkedAccounts,
            });
        },
    };
}
exports.default = getRecipeImplementation;
