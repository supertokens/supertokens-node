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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.Error = exports.getRequestFromUserContext = exports.convertToRecipeUserId = exports.listUsersByAccountInfo = exports.getUser = exports.updateOrDeleteUserIdMappingInfo = exports.deleteUserIdMapping = exports.getUserIdMapping = exports.createUserIdMapping = exports.deleteUser = exports.getUsersNewestFirst = exports.getUsersOldestFirst = exports.getUserCount = exports.getAllCORSHeaders = exports.init = void 0;
const supertokens_1 = __importDefault(require("./supertokens"));
const error_1 = __importDefault(require("./error"));
const recipe_1 = __importDefault(require("./recipe/accountlinking/recipe"));
const recipeUserId_1 = __importDefault(require("./recipeUserId"));
// For Express
class SuperTokensWrapper {
    static getAllCORSHeaders() {
        return supertokens_1.default.getInstanceOrThrowError().getAllCORSHeaders();
    }
    static getUserCount(includeRecipeIds) {
        return supertokens_1.default.getInstanceOrThrowError().getUserCount(includeRecipeIds);
    }
    static getUsersOldestFirst(input) {
        return recipe_1.default
            .getInstance()
            .recipeInterfaceImpl.getUsers(
                Object.assign(Object.assign({ timeJoinedOrder: "ASC" }, input), { userContext: undefined })
            );
    }
    static getUsersNewestFirst(input) {
        return recipe_1.default
            .getInstance()
            .recipeInterfaceImpl.getUsers(
                Object.assign(Object.assign({ timeJoinedOrder: "DESC" }, input), { userContext: undefined })
            );
    }
    static createUserIdMapping(input) {
        return supertokens_1.default.getInstanceOrThrowError().createUserIdMapping(input);
    }
    static getUserIdMapping(input) {
        return supertokens_1.default.getInstanceOrThrowError().getUserIdMapping(input);
    }
    static deleteUserIdMapping(input) {
        return supertokens_1.default.getInstanceOrThrowError().deleteUserIdMapping(input);
    }
    static updateOrDeleteUserIdMappingInfo(input) {
        return supertokens_1.default.getInstanceOrThrowError().updateOrDeleteUserIdMappingInfo(input);
    }
    static getUser(userId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.getUser({
                userId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static listUsersByAccountInfo(accountInfo, doUnionOfAccountInfo = false, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                accountInfo,
                doUnionOfAccountInfo,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static deleteUser(userId, removeAllLinkedAccounts = true, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.deleteUser({
                userId,
                removeAllLinkedAccounts,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static convertToRecipeUserId(recipeUserId) {
        return new recipeUserId_1.default(recipeUserId);
    }
    static getRequestFromUserContext(userContext) {
        return supertokens_1.default.getInstanceOrThrowError().getRequestFromUserContext(userContext);
    }
}
exports.default = SuperTokensWrapper;
SuperTokensWrapper.init = supertokens_1.default.init;
SuperTokensWrapper.Error = error_1.default;
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
exports.Error = SuperTokensWrapper.Error;
