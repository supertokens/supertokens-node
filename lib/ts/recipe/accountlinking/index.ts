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

import Recipe from "./recipe";
import type { RecipeInterface, AccountInfoWithRecipeId } from "./types";
import RecipeUserId from "../../recipeUserId";

export default class Wrapper {
    static init = Recipe.init;

    /**
     * This is a function which is a combination of createPrimaryUser and
     * linkAccounts where the input recipeUserID is either linked to a user that it can be
     * linked to, or is made into a primary user.
     *
     * The output will be the user ID of the user that it was linked to, or it will be the
     * same as the input recipeUserID if it was made into a primary user, or if there was
     * no linking that happened.
     */
    static async createPrimaryUserIdOrLinkAccounts(input: {
        tenantId: string;
        recipeUserId: RecipeUserId;
        checkAccountsToLinkTableAsWell?: boolean;
        userContext?: any;
    }) {
        return await Recipe.getInstance().createPrimaryUserIdOrLinkAccounts({
            tenantId: input.tenantId,
            recipeUserId: input.recipeUserId,
            checkAccountsToLinkTableAsWell: input.checkAccountsToLinkTableAsWell ?? true,
            userContext: input.userContext === undefined ? {} : input.userContext,
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
    static async getPrimaryUserIdThatCanBeLinkedToRecipeUserId(input: {
        recipeUserId: RecipeUserId;
        checkAccountsToLinkTableAsWell?: boolean;
        userContext?: any;
    }) {
        return await Recipe.getInstance().getPrimaryUserIdThatCanBeLinkedToRecipeUserId({
            recipeUserId: input.recipeUserId,
            checkAccountsToLinkTableAsWell: input.checkAccountsToLinkTableAsWell ?? true,
            userContext: input.userContext === undefined ? {} : input.userContext,
        });
    }

    static async canCreatePrimaryUser(recipeUserId: RecipeUserId, userContext?: any) {
        return await Recipe.getInstance().recipeInterfaceImpl.canCreatePrimaryUser({
            recipeUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async createPrimaryUser(recipeUserId: RecipeUserId, userContext?: any) {
        return await Recipe.getInstance().recipeInterfaceImpl.createPrimaryUser({
            recipeUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async canLinkAccounts(recipeUserId: RecipeUserId, primaryUserId: string, userContext?: any) {
        return await Recipe.getInstance().recipeInterfaceImpl.canLinkAccounts({
            recipeUserId,
            primaryUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async linkAccounts(tenantId: string, recipeUserId: RecipeUserId, primaryUserId: string, userContext?: any) {
        return await Recipe.getInstance().recipeInterfaceImpl.linkAccounts({
            tenantId,
            recipeUserId,
            primaryUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async unlinkAccount(recipeUserId: RecipeUserId, userContext?: any) {
        return await Recipe.getInstance().recipeInterfaceImpl.unlinkAccount({
            recipeUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async fetchFromAccountToLinkTable(recipeUserId: RecipeUserId, userContext?: any) {
        return await Recipe.getInstance().recipeInterfaceImpl.fetchFromAccountToLinkTable({
            recipeUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async storeIntoAccountToLinkTable(recipeUserId: RecipeUserId, primaryUserId: string, userContext?: any) {
        return await Recipe.getInstance().recipeInterfaceImpl.storeIntoAccountToLinkTable({
            recipeUserId,
            primaryUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async isSignUpAllowed(newUser: AccountInfoWithRecipeId, isVerified: boolean, userContext?: any) {
        return await Recipe.getInstance().isSignUpAllowed({
            newUser,
            isVerified,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async isSignInAllowed(recipeUserId: RecipeUserId, userContext?: any) {
        return await Recipe.getInstance().isSignInAllowed({
            recipeUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async isEmailChangeAllowed(
        recipeUserId: RecipeUserId,
        newEmail: string,
        isVerified: boolean,
        userContext?: any
    ) {
        return await Recipe.getInstance().isEmailChangeAllowed({
            recipeUserId,
            newEmail,
            isVerified,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
}

export const init = Wrapper.init;
export const canCreatePrimaryUser = Wrapper.canCreatePrimaryUser;
export const createPrimaryUser = Wrapper.createPrimaryUser;
export const canLinkAccounts = Wrapper.canLinkAccounts;
export const linkAccounts = Wrapper.linkAccounts;
export const unlinkAccount = Wrapper.unlinkAccount;
export const fetchFromAccountToLinkTable = Wrapper.fetchFromAccountToLinkTable;
export const storeIntoAccountToLinkTable = Wrapper.storeIntoAccountToLinkTable;
export const createPrimaryUserIdOrLinkAccounts = Wrapper.createPrimaryUserIdOrLinkAccounts;
export const getPrimaryUserIdThatCanBeLinkedToRecipeUserId = Wrapper.getPrimaryUserIdThatCanBeLinkedToRecipeUserId;
export const isSignUpAllowed = Wrapper.isSignUpAllowed;
export const isSignInAllowed = Wrapper.isSignInAllowed;
export const isEmailChangeAllowed = Wrapper.isEmailChangeAllowed;

export type { RecipeInterface };
