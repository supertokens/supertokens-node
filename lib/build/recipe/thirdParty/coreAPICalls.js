"use strict";
/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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
const normalisedURLPath_1 = require("../../normalisedURLPath");
function signInUp(recipeInstance, thirdPartyId, thirdPartyUserId, email) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendPostRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/signinup"), {
                thirdPartyId,
                thirdPartyUserId,
                email,
            });
        return {
            isNewUser: response.createdNewUser,
            user: response.user,
        };
    });
}
exports.signInUp = signInUp;
function getUserById(recipeInstance, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendGetRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/user"), {
                userId,
            });
        if (response.status === "OK") {
            return Object.assign({}, response.user);
        } else {
            return undefined;
        }
    });
}
exports.getUserById = getUserById;
function getUserByThirdPartyInfo(recipeInstance, thirdPartyId, thirdPartyUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendGetRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/user"), {
                thirdPartyId,
                thirdPartyUserId,
            });
        if (response.status === "OK") {
            return Object.assign({}, response.user);
        } else {
            return undefined;
        }
    });
}
exports.getUserByThirdPartyInfo = getUserByThirdPartyInfo;
function getUsers(recipeInstance, timeJoinedOrder, limit, paginationToken) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendGetRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/users"), {
                timeJoinedOrder,
                limit,
                paginationToken,
            });
        return {
            users: response.users,
            nextPaginationToken: response.nextPaginationToken,
        };
    });
}
exports.getUsers = getUsers;
function getUsersCount(recipeInstance) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield recipeInstance
            .getQuerier()
            .sendGetRequest(new normalisedURLPath_1.default(recipeInstance.getRecipeId(), "/recipe/users/count"), {});
        return Number(response.count);
    });
}
exports.getUsersCount = getUsersCount;
//# sourceMappingURL=coreAPICalls.js.map
