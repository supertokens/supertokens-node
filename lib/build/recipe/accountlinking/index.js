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
exports.isEmailChangeAllowed = exports.isSignInAllowed = exports.isSignUpAllowed = exports.getPrimaryUserIdThatCanBeLinkedToRecipeUserId = exports.createPrimaryUserIdOrLinkAccounts = exports.unlinkAccount = exports.linkAccounts = exports.canLinkAccounts = exports.createPrimaryUser = exports.canCreatePrimaryUser = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
class Wrapper {
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
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                tenantId: input.tenantId,
                recipeUserId: input.recipeUserId,
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
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
                recipeUserId: input.recipeUserId,
                userContext: input.userContext === undefined ? {} : input.userContext,
            });
        });
    }
    static canCreatePrimaryUser(recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.canCreatePrimaryUser({
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
    static canLinkAccounts(recipeUserId, primaryUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.canLinkAccounts({
                recipeUserId,
                primaryUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static linkAccounts(tenantId, recipeUserId, primaryUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.linkAccounts({
                tenantId,
                recipeUserId,
                primaryUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static unlinkAccount(recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().recipeInterfaceImpl.unlinkAccount({
                recipeUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static isSignUpAllowed(newUser, isVerified, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().isSignUpAllowed({
                newUser,
                isVerified,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static isSignInAllowed(recipeUserId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().isSignInAllowed({
                recipeUserId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static isEmailChangeAllowed(recipeUserId, newEmail, isVerified, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield recipe_1.default.getInstance().isEmailChangeAllowed({
                recipeUserId,
                newEmail,
                isVerified,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
exports.init = Wrapper.init;
exports.canCreatePrimaryUser = Wrapper.canCreatePrimaryUser;
exports.createPrimaryUser = Wrapper.createPrimaryUser;
exports.canLinkAccounts = Wrapper.canLinkAccounts;
exports.linkAccounts = Wrapper.linkAccounts;
exports.unlinkAccount = Wrapper.unlinkAccount;
exports.createPrimaryUserIdOrLinkAccounts = Wrapper.createPrimaryUserIdOrLinkAccounts;
exports.getPrimaryUserIdThatCanBeLinkedToRecipeUserId = Wrapper.getPrimaryUserIdThatCanBeLinkedToRecipeUserId;
exports.isSignUpAllowed = Wrapper.isSignUpAllowed;
exports.isSignInAllowed = Wrapper.isSignInAllowed;
exports.isEmailChangeAllowed = Wrapper.isEmailChangeAllowed;
