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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.User =
    exports.RecipeUserId =
    exports.Error =
    exports.isRecipeInitialized =
    exports.getRequestFromUserContext =
    exports.convertToRecipeUserId =
    exports.listUsersByAccountInfo =
    exports.getUser =
    exports.updateOrDeleteUserIdMappingInfo =
    exports.deleteUserIdMapping =
    exports.getUserIdMapping =
    exports.createUserIdMapping =
    exports.deleteUser =
    exports.getUsersNewestFirst =
    exports.getUsersOldestFirst =
    exports.getUserCount =
    exports.getAllCORSHeaders =
    exports.init =
        void 0;
const supertokens_1 = __importDefault(require("./supertokens"));
const error_1 = __importDefault(require("./error"));
const recipe_1 = __importDefault(require("./recipe/accountlinking/recipe"));
const recipeUserId_1 = __importDefault(require("./recipeUserId"));
const user_1 = require("./user");
const utils_1 = require("./utils");
// For Express
class SuperTokensWrapper {
    static getAllCORSHeaders() {
        return supertokens_1.default.getInstanceOrThrowError().getAllCORSHeaders();
    }
    static getUserCount(includeRecipeIds, tenantId, userContext) {
        return supertokens_1.default
            .getInstanceOrThrowError()
            .getUserCount(includeRecipeIds, tenantId, (0, utils_1.getUserContext)(userContext));
    }
    static getUsersOldestFirst(input) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUsers(
            Object.assign(Object.assign({ timeJoinedOrder: "ASC" }, input), {
                userContext: (0, utils_1.getUserContext)(input.userContext),
            })
        );
    }
    static getUsersNewestFirst(input) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUsers(
            Object.assign(Object.assign({ timeJoinedOrder: "DESC" }, input), {
                userContext: (0, utils_1.getUserContext)(input.userContext),
            })
        );
    }
    static createUserIdMapping(input) {
        return supertokens_1.default
            .getInstanceOrThrowError()
            .createUserIdMapping(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static getUserIdMapping(input) {
        return supertokens_1.default
            .getInstanceOrThrowError()
            .getUserIdMapping(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static deleteUserIdMapping(input) {
        return supertokens_1.default
            .getInstanceOrThrowError()
            .deleteUserIdMapping(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static updateOrDeleteUserIdMappingInfo(input) {
        return supertokens_1.default
            .getInstanceOrThrowError()
            .updateOrDeleteUserIdMappingInfo(
                Object.assign(Object.assign({}, input), { userContext: (0, utils_1.getUserContext)(input.userContext) })
            );
    }
    static async getUser(userId, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getUser({
            userId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async listUsersByAccountInfo(tenantId, accountInfo, doUnionOfAccountInfo = false, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listUsersByAccountInfo({
            tenantId,
            accountInfo,
            doUnionOfAccountInfo,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async deleteUser(userId, removeAllLinkedAccounts = true, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.deleteUser({
            userId,
            removeAllLinkedAccounts,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static convertToRecipeUserId(recipeUserId) {
        return new recipeUserId_1.default(recipeUserId);
    }
    static getRequestFromUserContext(userContext) {
        return supertokens_1.default.getInstanceOrThrowError().getRequestFromUserContext(userContext);
    }
    static isRecipeInitialized(recipeId) {
        return supertokens_1.default
            .getInstanceOrThrowError()
            .recipeModules.map((recipe) => recipe.getRecipeId())
            .includes(recipeId);
    }
}
SuperTokensWrapper.init = supertokens_1.default.init;
SuperTokensWrapper.Error = error_1.default;
SuperTokensWrapper.RecipeUserId = recipeUserId_1.default;
SuperTokensWrapper.User = user_1.User;
exports.default = SuperTokensWrapper;
exports.init = SuperTokensWrapper.init;
exports.getAllCORSHeaders = SuperTokensWrapper.getAllCORSHeaders;
exports.getUserCount = SuperTokensWrapper.getUserCount;
exports.getUsersOldestFirst = SuperTokensWrapper.getUsersOldestFirst;
exports.getUsersNewestFirst = SuperTokensWrapper.getUsersNewestFirst;
exports.deleteUser = SuperTokensWrapper.deleteUser;
exports.createUserIdMapping = SuperTokensWrapper.createUserIdMapping;
exports.getUserIdMapping = SuperTokensWrapper.getUserIdMapping;
exports.deleteUserIdMapping = SuperTokensWrapper.deleteUserIdMapping;
exports.updateOrDeleteUserIdMappingInfo = SuperTokensWrapper.updateOrDeleteUserIdMappingInfo;
exports.getUser = SuperTokensWrapper.getUser;
exports.listUsersByAccountInfo = SuperTokensWrapper.listUsersByAccountInfo;
exports.convertToRecipeUserId = SuperTokensWrapper.convertToRecipeUserId;
exports.getRequestFromUserContext = SuperTokensWrapper.getRequestFromUserContext;
exports.isRecipeInitialized = SuperTokensWrapper.isRecipeInitialized;
exports.Error = SuperTokensWrapper.Error;
var recipeUserId_2 = require("./recipeUserId");
Object.defineProperty(exports, "RecipeUserId", {
    enumerable: true,
    get: function () {
        return __importDefault(recipeUserId_2).default;
    },
});
var user_2 = require("./user");
Object.defineProperty(exports, "User", {
    enumerable: true,
    get: function () {
        return user_2.User;
    },
});
