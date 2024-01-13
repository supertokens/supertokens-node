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
        getUsers: async function ({
            tenantId,
            timeJoinedOrder,
            limit,
            paginationToken,
            includeRecipeIds,
            query,
            userContext,
        }) {
            let includeRecipeIdsStr = undefined;
            if (includeRecipeIds !== undefined) {
                includeRecipeIdsStr = includeRecipeIds.join(",");
            }
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(
                    `${tenantId !== null && tenantId !== void 0 ? tenantId : "public"}/users`
                ),
                Object.assign(
                    {
                        includeRecipeIds: includeRecipeIdsStr,
                        timeJoinedOrder: timeJoinedOrder,
                        limit: limit,
                        paginationToken: paginationToken,
                    },
                    query
                ),
                userContext
            );
            return {
                users: response.users.map((u) => new user_1.User(u)),
                nextPaginationToken: response.nextPaginationToken,
            };
        },
        canCreatePrimaryUser: async function ({ recipeUserId, userContext }) {
            return await querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/accountlinking/user/primary/check"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
        },
        createPrimaryUser: async function ({ recipeUserId, userContext }) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/accountlinking/user/primary"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
            if (response.status === "OK") {
                response.user = new user_1.User(response.user);
            }
            return response;
        },
        canLinkAccounts: async function ({ recipeUserId, primaryUserId, userContext }) {
            let result = await querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/accountlinking/user/link/check"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                    primaryUserId,
                },
                userContext
            );
            return result;
        },
        linkAccounts: async function ({ recipeUserId, primaryUserId, userContext }) {
            const accountsLinkingResult = await querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/accountlinking/user/link"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                    primaryUserId,
                },
                userContext
            );
            if (
                ["OK", "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"].includes(
                    accountsLinkingResult.status
                )
            ) {
                accountsLinkingResult.user = new user_1.User(accountsLinkingResult.user);
            }
            if (accountsLinkingResult.status === "OK") {
                let user = accountsLinkingResult.user;
                if (!accountsLinkingResult.accountsAlreadyLinked) {
                    await recipeInstance.verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
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
                    await config.onAccountLinked(user, loginMethodInfo, userContext);
                }
                accountsLinkingResult.user = user;
            }
            return accountsLinkingResult;
        },
        unlinkAccount: async function ({ recipeUserId, userContext }) {
            let accountsUnlinkingResult = await querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/accountlinking/user/unlink"),
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
            return accountsUnlinkingResult;
        },
        getUser: async function ({ userId, userContext }) {
            let result = await querier.sendGetRequest(
                new normalisedURLPath_1.default("/user/id"),
                {
                    userId,
                },
                userContext
            );
            if (result.status === "OK") {
                return new user_1.User(result.user);
            }
            return undefined;
        },
        listUsersByAccountInfo: async function ({ tenantId, accountInfo, doUnionOfAccountInfo, userContext }) {
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
                },
                userContext
            );
            return result.users.map((u) => new user_1.User(u));
        },
        deleteUser: async function ({ userId, removeAllLinkedAccounts, userContext }) {
            return await querier.sendPostRequest(
                new normalisedURLPath_1.default("/user/remove"),
                {
                    userId,
                    removeAllLinkedAccounts,
                },
                userContext
            );
        },
    };
}
exports.default = getRecipeImplementation;
