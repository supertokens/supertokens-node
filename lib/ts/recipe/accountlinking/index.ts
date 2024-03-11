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
import { getUser } from "../..";
import { getUserContext } from "../../utils";
import { SessionContainerInterface } from "../session/types";

export default class Wrapper {
    static init = Recipe.init;

    /**
     * This is a function which is a combination of createPrimaryUser and
     * linkAccounts where the input recipeUserId is either linked to a user that it can be
     * linked to, or is made into a primary user.
     *
     * The output will be the user ID of the user that it was linked to, or it will be the
     * same as the input recipeUserId if it was made into a primary user, or if there was
     * no linking that happened.
     */
    static async createPrimaryUserIdOrLinkAccounts(
        tenantId: string,
        recipeUserId: RecipeUserId,
        session?: SessionContainerInterface,
        userContext?: Record<string, any>
    ) {
        const user = await getUser(recipeUserId.getAsString(), userContext);
        if (user === undefined) {
            // Should never really come here unless a programming error happened in the app
            throw new Error("Unknown recipeUserId");
        }
        const linkRes = await Recipe.getInstance().tryLinkingByAccountInfoOrCreatePrimaryUser({
            tenantId,
            inputUser: user,
            session,
            userContext: getUserContext(userContext),
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
    static async getPrimaryUserThatCanBeLinkedToRecipeUserId(
        tenantId: string,
        recipeUserId: RecipeUserId,
        userContext?: Record<string, any>
    ) {
        const user = await getUser(recipeUserId.getAsString(), userContext);
        if (user === undefined) {
            // Should never really come here unless a programming error happened in the app
            throw new Error("Unknown recipeUserId");
        }
        return await Recipe.getInstance().getPrimaryUserThatCanBeLinkedToRecipeUserId({
            tenantId,
            user,
            userContext: getUserContext(userContext),
        });
    }

    static async canCreatePrimaryUser(recipeUserId: RecipeUserId, userContext?: Record<string, any>) {
        return await Recipe.getInstance().recipeInterfaceImpl.canCreatePrimaryUser({
            recipeUserId,
            userContext: getUserContext(userContext),
        });
    }

    static async createPrimaryUser(recipeUserId: RecipeUserId, userContext?: Record<string, any>) {
        return await Recipe.getInstance().recipeInterfaceImpl.createPrimaryUser({
            recipeUserId,
            userContext: getUserContext(userContext),
        });
    }

    static async canLinkAccounts(recipeUserId: RecipeUserId, primaryUserId: string, userContext?: Record<string, any>) {
        return await Recipe.getInstance().recipeInterfaceImpl.canLinkAccounts({
            recipeUserId,
            primaryUserId,
            userContext: getUserContext(userContext),
        });
    }

    static async linkAccounts(recipeUserId: RecipeUserId, primaryUserId: string, userContext?: Record<string, any>) {
        return await Recipe.getInstance().recipeInterfaceImpl.linkAccounts({
            recipeUserId,
            primaryUserId,
            userContext: getUserContext(userContext),
        });
    }

    static async unlinkAccount(recipeUserId: RecipeUserId, userContext?: Record<string, any>) {
        return await Recipe.getInstance().recipeInterfaceImpl.unlinkAccount({
            recipeUserId,
            userContext: getUserContext(userContext),
        });
    }

    static async isSignUpAllowed(
        tenantId: string,
        newUser: AccountInfoWithRecipeId,
        isVerified: boolean,
        session?: SessionContainerInterface,
        userContext?: Record<string, any>
    ) {
        return await Recipe.getInstance().isSignUpAllowed({
            newUser,
            isVerified,
            session,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async isSignInAllowed(
        tenantId: string,
        recipeUserId: RecipeUserId,
        session?: SessionContainerInterface,
        userContext?: Record<string, any>
    ) {
        const user = await getUser(recipeUserId.getAsString(), userContext);
        if (user === undefined) {
            // Should never really come here unless a programming error happened in the app
            throw new Error("Unknown recipeUserId");
        }

        return await Recipe.getInstance().isSignInAllowed({
            user,
            accountInfo: user.loginMethods.find((lm) => lm.recipeUserId.getAsString() === recipeUserId.getAsString())!,
            session,
            tenantId,
            signInVerifiesLoginMethod: false,
            userContext: getUserContext(userContext),
        });
    }

    static async isEmailChangeAllowed(
        recipeUserId: RecipeUserId,
        newEmail: string,
        isVerified: boolean,
        session?: SessionContainerInterface,
        userContext?: Record<string, any>
    ) {
        const user = await getUser(recipeUserId.getAsString(), userContext);

        return await Recipe.getInstance().isEmailChangeAllowed({
            user,
            newEmail,
            isVerified,
            session,
            userContext: getUserContext(userContext),
        });
    }
}

export const init = Wrapper.init;
export const canCreatePrimaryUser = Wrapper.canCreatePrimaryUser;
export const createPrimaryUser = Wrapper.createPrimaryUser;
export const canLinkAccounts = Wrapper.canLinkAccounts;
export const linkAccounts = Wrapper.linkAccounts;
export const unlinkAccount = Wrapper.unlinkAccount;
export const createPrimaryUserIdOrLinkAccounts = Wrapper.createPrimaryUserIdOrLinkAccounts;
export const getPrimaryUserThatCanBeLinkedToRecipeUserId = Wrapper.getPrimaryUserThatCanBeLinkedToRecipeUserId;
export const isSignUpAllowed = Wrapper.isSignUpAllowed;
export const isSignInAllowed = Wrapper.isSignInAllowed;
export const isEmailChangeAllowed = Wrapper.isEmailChangeAllowed;

export type { RecipeInterface };
