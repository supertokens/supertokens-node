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
import { SessionContainerInterface } from "../session/types";
import RecipeUserId from "../../recipeUserId";
import { AccountLinkingClaim } from "./accountLinkingClaim";
export default class Wrapper {
    static init = Recipe.init;

    static AccountLinkingClaim = AccountLinkingClaim;

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
        recipeUserId: RecipeUserId;
        isVerified: boolean;
        checkAccountsToLinkTableAsWell?: boolean;
        userContext?: any;
    }) {
        return await Recipe.getInstance().createPrimaryUserIdOrLinkAccounts({
            recipeUserId: input.recipeUserId,
            isVerified: input.isVerified,
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
    static async linkAccountsWithUserFromSession<T>(input: {
        session: SessionContainerInterface;
        newUser: AccountInfoWithRecipeId;
        createRecipeUserFunc: (userContext: any) => Promise<void>;
        verifyCredentialsFunc: (
            userContext: any
        ) => Promise<
            | { status: "OK" }
            | {
                  status: "CUSTOM_RESPONSE";
                  resp: T;
              }
        >;
        userContext?: any;
    }) {
        return await Recipe.getInstance().linkAccountWithUserFromSession<T>({
            session: input.session,
            newUser: input.newUser,
            createRecipeUserFunc: input.createRecipeUserFunc,
            verifyCredentialsFunc: input.verifyCredentialsFunc,
            userContext: input.userContext === undefined ? {} : input.userContext,
        });
    }

    static async canLinkAccounts(recipeUserId: RecipeUserId, primaryUserId: string, userContext?: any) {
        return await Recipe.getInstance().recipeInterfaceImpl.canLinkAccounts({
            recipeUserId,
            primaryUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async linkAccounts(recipeUserId: RecipeUserId, primaryUserId: string, userContext?: any) {
        return await Recipe.getInstance().recipeInterfaceImpl.linkAccounts({
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
        userContext = userContext === undefined ? {} : userContext;
        return await Recipe.getInstance().recipeInterfaceImpl.fetchFromAccountToLinkTable({
            recipeUserId,
            userContext,
        });
    }

    static async storeIntoAccountToLinkTable(recipeUserId: RecipeUserId, primaryUserId: string, userContext?: any) {
        userContext = userContext === undefined ? {} : userContext;
        return await Recipe.getInstance().recipeInterfaceImpl.storeIntoAccountToLinkTable({
            recipeUserId,
            primaryUserId,
            userContext,
        });
    }

    static async isSignUpAllowed(newUser: AccountInfoWithRecipeId, isVerified: boolean, userContext?: any) {
        userContext = userContext === undefined ? {} : userContext;
        return await Recipe.getInstance().isSignUpAllowed({
            newUser,
            isVerified,
            userContext,
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
export const linkAccountsWithUserFromSession = Wrapper.linkAccountsWithUserFromSession;
export const isSignUpAllowed = Wrapper.isSignUpAllowed;

export type { RecipeInterface };

export { AccountLinkingClaim } from "./accountLinkingClaim";
