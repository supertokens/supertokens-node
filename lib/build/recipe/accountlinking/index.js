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
exports.AccountLinkingClaim = exports.linkAccountsWithUserFromSession = exports.getPrimaryUserIdThatCanBeLinkedToRecipeUserId = exports.createPrimaryUserIdOrLinkAccounts = exports.storeIntoAccountToLinkTable = exports.fetchFromAccountToLinkTable = exports.unlinkAccounts = exports.linkAccounts = exports.canLinkAccounts = exports.createPrimaryUser = exports.canCreatePrimaryUserId = exports.getPrimaryUserIdsForRecipeUserIds = exports.getRecipeUserIdsForPrimaryUserIds = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const accountLinkingClaim_1 = require("./accountLinkingClaim");
class Wrapper {
    static getRecipeUserIdsForPrimaryUserIds(primaryUserIds, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.getRecipeUserIdsForPrimaryUserIds({
                primaryUserIds,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static getPrimaryUserIdsForRecipeUserIds(recipeUserIds, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.getPrimaryUserIdsForRecipeUserIds({
                recipeUserIds,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    /**
     * This is a function which is a combination of createPrimaryUser and
     * linkAccounts where the input recipeUserID is either linked to a user that it can be
     * linked to, or is made into a primary user.
     *
     * The output will be the user ID of the user that it was linked to, or it will be the
     * same as the input recipeUserID if it was made into a primary user, or if there was
     * no linking that happened.
     */
    static createPrimaryUserIdOrLinkAccounts(input) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                recipeUserId: input.recipeUserId,
                isVerified: input.isVerified,
                checkAccountsToLinkTableAsWell:
                    (_a = input.checkAccountsToLinkTableAsWell) !== null && _a !== void 0 ? _a : true,
                userContext: input.userContext === undefined ? {} : input.userContext,
            });
        });
    }
    /**
     * This function returns the primary user that the input recipe ID can be
     * linked to. It can be used to determine which primary account the linking
     * will happen to if the input recipe user ID was to be linked.
     *
     * If the function returns undefined, it means that there is no primary user
     * that the input recipe ID can be linked to, and therefore it can be made
     * into a primary user itself.
     */
    static getPrimaryUserIdThatCanBeLinkedToRecipeUserId(input) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
                recipeUserId: input.recipeUserId,
                checkAccountsToLinkTableAsWell:
                    (_a = input.checkAccountsToLinkTableAsWell) !== null && _a !== void 0 ? _a : true,
                userContext: input.userContext === undefined ? {} : input.userContext,
            });
        });
    }
    static canCreatePrimaryUserId(recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.canCreatePrimaryUserId({
                recipeUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static createPrimaryUser(recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.createPrimaryUser({
                recipeUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    /**
     * This function is similar to linkAccounts, but it specifically
     * works for when trying to link accounts with a user that you are already logged
     * into. This can be used to implement, for example, connecting social accounts to your *
     * existing email password account.
     *
     * This function also creates a new recipe user for the newUser if required, and for that,
     * it allows you to provide two functions:
     *  - createRecipeUserFunc: Used to create a new account for newUser
     *  - verifyCredentialsFunc: If the new account already exists, this function will be called
     *      and you can verify the input credentials before we attempt linking. If the input
     *      credentials are not OK, then you can return a `CUSTOM_RESPONSE` status and that
     *      will be returned back to you from this function call.
     */
    static linkAccountsWithUserFromSession(input) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().linkAccountsWithUserFromSession({
                session: input.session,
                newUser: input.newUser,
                createRecipeUserFunc: input.createRecipeUserFunc,
                verifyCredentialsFunc: input.verifyCredentialsFunc,
                userContext: input.userContext === undefined ? {} : input.userContext,
            });
        });
    }
    static canLinkAccounts(recipeUserId, primaryUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.canLinkAccounts({
                recipeUserId,
                primaryUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static linkAccounts(recipeUserId, primaryUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.linkAccounts({
                recipeUserId,
                primaryUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static unlinkAccounts(recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.unlinkAccounts({
                recipeUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static fetchFromAccountToLinkTable(recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            userContext = userContext === undefined ? {} : userContext;
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.fetchFromAccountToLinkTable({
                recipeUserId,
                userContext,
            });
        });
    }
    static storeIntoAccountToLinkTable(recipeUserId, primaryUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            userContext = userContext === undefined ? {} : userContext;
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.storeIntoAccountToLinkTable({
                recipeUserId,
                primaryUserId,
                userContext,
            });
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.AccountLinkingClaim = accountLinkingClaim_1.AccountLinkingClaim;
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
exports.createPrimaryUserIdOrLinkAccounts = Wrapper.createPrimaryUserIdOrLinkAccounts;
exports.getPrimaryUserIdThatCanBeLinkedToRecipeUserId = Wrapper.getPrimaryUserIdThatCanBeLinkedToRecipeUserId;
exports.linkAccountsWithUserFromSession = Wrapper.linkAccountsWithUserFromSession;
var accountLinkingClaim_2 = require("./accountLinkingClaim");
Object.defineProperty(exports, "AccountLinkingClaim", {
    enumerable: true,
    get: function () {
        return accountLinkingClaim_2.AccountLinkingClaim;
    },
});
