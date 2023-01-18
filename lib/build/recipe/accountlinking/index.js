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
const recipe_1 = require("./recipe");
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
    static getPrimaryUserIdsforRecipeUserIds(recipeUserIds, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default
                .getInstanceOrThrowError()
                .recipeInterfaceImpl.getPrimaryUserIdsforRecipeUserIds({
                    recipeUserIds,
                    userContext: userContext === undefined ? {} : userContext,
                });
        });
    }
    static addNewRecipeUserIdWithoutPrimaryUserId(recipeUserId, recipeId, timeJoined, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default
                .getInstanceOrThrowError()
                .recipeInterfaceImpl.addNewRecipeUserIdWithoutPrimaryUserId({
                    recipeUserId,
                    recipeId,
                    timeJoined,
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
    static createPrimaryUser(recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createPrimaryUser({
                recipeUserId,
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
    static linkAccounts(recipeUserId, primaryUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.linkAccounts({
                recipeUserId,
                primaryUserId,
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
    static isSignUpAllowed(info, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().isSignUpAllowed({
                info,
                userContext,
            });
        });
    }
    static doPostSignUpAccountLinkingOperations(info, infoVerified, recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().doPostSignUpAccountLinkingOperations({
                info,
                infoVerified,
                recipeUserId,
                userContext,
            });
        });
    }
    static accountLinkPostSignInViaSession(session, info, infoVerified, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstanceOrThrowError().accountLinkPostSignInViaSession({
                session,
                info,
                infoVerified,
                userContext,
            });
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
exports.init = Wrapper.init;
exports.getRecipeUserIdsForPrimaryUserIds = Wrapper.getRecipeUserIdsForPrimaryUserIds;
exports.getPrimaryUserIdsforRecipeUserIds = Wrapper.getPrimaryUserIdsforRecipeUserIds;
exports.addNewRecipeUserIdWithoutPrimaryUserId = Wrapper.addNewRecipeUserIdWithoutPrimaryUserId;
exports.canCreatePrimaryUserId = Wrapper.canCreatePrimaryUserId;
exports.createPrimaryUser = Wrapper.createPrimaryUser;
exports.canLinkAccounts = Wrapper.canLinkAccounts;
exports.linkAccounts = Wrapper.linkAccounts;
exports.unlinkAccounts = Wrapper.unlinkAccounts;
exports.isSignUpAllowed = Wrapper.isSignUpAllowed;
exports.doPostSignUpAccountLinkingOperations = Wrapper.doPostSignUpAccountLinkingOperations;
exports.accountLinkPostSignInViaSession = Wrapper.accountLinkPostSignInViaSession;
