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
function getRecipeImplementation(querier) {
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
        canCreatePrimaryUserId: function (_input) {
            return __awaiter(this, void 0, void 0, function* () {
                return {
                    status: "OK",
                };
            });
        },
        createPrimaryUser: function (_input) {
            return __awaiter(this, void 0, void 0, function* () {
                return {
                    status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                    primaryUserId: "",
                    description: "",
                };
            });
        },
        canLinkAccounts: function (_input) {
            return __awaiter(this, void 0, void 0, function* () {
                return {
                    status: "OK",
                };
            });
        },
        linkAccounts: function (_input) {
            return __awaiter(this, void 0, void 0, function* () {
                return {
                    status: "OK",
                };
            });
        },
        unlinkAccounts: function (_ipnut) {
            return __awaiter(this, void 0, void 0, function* () {
                return {
                    status: "OK",
                    wasRecipeUserDeleted: false,
                };
            });
        },
    };
}
exports.default = getRecipeImplementation;
