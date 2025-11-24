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
exports.isEmailChangeAllowed =
    exports.isSignInAllowed =
    exports.isSignUpAllowed =
    exports.getPrimaryUserThatCanBeLinkedToRecipeUserId =
    exports.createPrimaryUserIdOrLinkAccounts =
    exports.unlinkAccount =
    exports.linkAccounts =
    exports.canLinkAccounts =
    exports.createPrimaryUser =
    exports.canCreatePrimaryUser =
    exports.init =
        void 0;
const recipe_1 = __importDefault(require("./recipe"));
const __1 = require("../..");
const utils_1 = require("../../utils");
class Wrapper {
    /**
     * This is a function which is a combination of createPrimaryUser and
     * linkAccounts where the input recipeUserId is either linked to a user that it can be
     * linked to, or is made into a primary user.
     *
     * The output will be the user ID of the user that it was linked to, or it will be the
     * same as the input recipeUserId if it was made into a primary user, or if there was
     * no linking that happened.
     */
    static async createPrimaryUserIdOrLinkAccounts(tenantId, recipeUserId, session, userContext) {
        const user = await (0, __1.getUser)(recipeUserId.getAsString(), userContext);
        if (user === undefined) {
            // Should never really come here unless a programming error happened in the app
            throw new Error("Unknown recipeUserId");
        }
        const linkRes = await recipe_1.default.getInstanceOrThrowError().tryLinkingByAccountInfoOrCreatePrimaryUser({
            tenantId,
            inputUser: user,
            session,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
        if (linkRes.status === "NO_LINK") {
            return user;
        }
        return linkRes.user;
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
    static async getPrimaryUserThatCanBeLinkedToRecipeUserId(tenantId, recipeUserId, userContext) {
        const user = await (0, __1.getUser)(recipeUserId.getAsString(), userContext);
        if (user === undefined) {
            // Should never really come here unless a programming error happened in the app
            throw new Error("Unknown recipeUserId");
        }
        return await recipe_1.default.getInstanceOrThrowError().getPrimaryUserThatCanBeLinkedToRecipeUserId({
            tenantId,
            user,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async canCreatePrimaryUser(recipeUserId, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.canCreatePrimaryUser({
            recipeUserId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async createPrimaryUser(recipeUserId, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.createPrimaryUser({
            recipeUserId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async canLinkAccounts(recipeUserId, primaryUserId, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.canLinkAccounts({
            recipeUserId,
            primaryUserId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async linkAccounts(recipeUserId, primaryUserId, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.linkAccounts({
            recipeUserId,
            primaryUserId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async unlinkAccount(recipeUserId, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.unlinkAccount({
            recipeUserId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async isSignUpAllowed(tenantId, newUser, isVerified, session, userContext) {
        return await recipe_1.default.getInstanceOrThrowError().isSignUpAllowed({
            newUser,
            isVerified,
            session,
            tenantId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async isSignInAllowed(tenantId, recipeUserId, session, userContext) {
        const user = await (0, __1.getUser)(recipeUserId.getAsString(), userContext);
        if (user === undefined) {
            // Should never really come here unless a programming error happened in the app
            throw new Error("Unknown recipeUserId");
        }
        return await recipe_1.default.getInstanceOrThrowError().isSignInAllowed({
            user,
            accountInfo: user.loginMethods.find((lm) => lm.recipeUserId.getAsString() === recipeUserId.getAsString()),
            session,
            tenantId,
            signInVerifiesLoginMethod: false,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async isEmailChangeAllowed(recipeUserId, newEmail, isVerified, session, userContext) {
        const user = await (0, __1.getUser)(recipeUserId.getAsString(), userContext);
        if (user === undefined) {
            throw new Error("Passed in recipe user id does not exist");
        }
        const res = await recipe_1.default.getInstanceOrThrowError().isEmailChangeAllowed({
            user,
            newEmail,
            isVerified,
            session,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
        return res.allowed;
    }
}
Wrapper.init = recipe_1.default.init;
exports.default = Wrapper;
exports.init = Wrapper.init;
exports.canCreatePrimaryUser = Wrapper.canCreatePrimaryUser;
exports.createPrimaryUser = Wrapper.createPrimaryUser;
exports.canLinkAccounts = Wrapper.canLinkAccounts;
exports.linkAccounts = Wrapper.linkAccounts;
exports.unlinkAccount = Wrapper.unlinkAccount;
exports.createPrimaryUserIdOrLinkAccounts = Wrapper.createPrimaryUserIdOrLinkAccounts;
exports.getPrimaryUserThatCanBeLinkedToRecipeUserId = Wrapper.getPrimaryUserThatCanBeLinkedToRecipeUserId;
exports.isSignUpAllowed = Wrapper.isSignUpAllowed;
exports.isSignInAllowed = Wrapper.isSignInAllowed;
exports.isEmailChangeAllowed = Wrapper.isEmailChangeAllowed;
