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
exports.storeIntoAccountToLinkTable = exports.fetchFromAccountToLinkTable = exports.unlinkAccounts = exports.linkAccounts = exports.canLinkAccounts = exports.createPrimaryUser = exports.canCreatePrimaryUserId = exports.getPrimaryUserIdsForRecipeUserIds = exports.getRecipeUserIdsForPrimaryUserIds = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
class Wrapper {
    static getRecipeUserIdsForPrimaryUserIds(primaryUserIds, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default
                .getInstanceOrThrowError()
                .recipeInterfaceImpl.getRecipeUserIdsForPrimaryUserIds({
                    primaryUserIds,
                    userContext: userContext === undefined ? {} : userContext,
                });
        });
    }
    static getPrimaryUserIdsForRecipeUserIds(recipeUserIds, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default
                .getInstanceOrThrowError()
                .recipeInterfaceImpl.getPrimaryUserIdsForRecipeUserIds({
                    recipeUserIds,
                    userContext: userContext === undefined ? {} : userContext,
                });
        });
    }
    static canCreatePrimaryUserId(recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.canCreatePrimaryUserId({
                recipeUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static createPrimaryUser(recipeUserId, session, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createPrimaryUser({
                recipeUserId,
                session,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static canLinkAccounts(recipeUserId, primaryUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.canLinkAccounts({
                recipeUserId,
                primaryUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static linkAccounts(recipeUserId, primaryUserId, session, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.linkAccounts({
                recipeUserId,
                primaryUserId,
                session,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static unlinkAccounts(recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.unlinkAccounts({
                recipeUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static fetchFromAccountToLinkTable(recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            userContext = userContext === undefined ? {} : userContext;
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.fetchFromAccountToLinkTable({
                recipeUserId,
                userContext,
            });
        });
    }
    static storeIntoAccountToLinkTable(recipeUserId, primaryUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            userContext = userContext === undefined ? {} : userContext;
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.storeIntoAccountToLinkTable({
                recipeUserId,
                primaryUserId,
                userContext,
            });
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
exports.init = Wrapper.init;
exports.getRecipeUserIdsForPrimaryUserIds = Wrapper.getRecipeUserIdsForPrimaryUserIds;
exports.getPrimaryUserIdsForRecipeUserIds = Wrapper.getPrimaryUserIdsForRecipeUserIds;
exports.canCreatePrimaryUserId = Wrapper.canCreatePrimaryUserId;
exports.createPrimaryUser = Wrapper.createPrimaryUser;
exports.canLinkAccounts = Wrapper.canLinkAccounts;
exports.linkAccounts = Wrapper.linkAccounts;
exports.unlinkAccounts = Wrapper.unlinkAccounts;
exports.fetchFromAccountToLinkTable = Wrapper.fetchFromAccountToLinkTable;
exports.storeIntoAccountToLinkTable = Wrapper.storeIntoAccountToLinkTable;
