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

import Recipe from "./recipe";
import SuperTokensError from "./error";
import * as thirdPartyProviders from "../thirdparty/providers";
import { RecipeInterface, User, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions } from "./types";
import { TypeProvider } from "../thirdparty/types";

// For Express
export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static signInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signInUp({ thirdPartyId, thirdPartyUserId, email });
    }

    static getUserByThirdPartyInfo(thirdPartyId: string, thirdPartyUserId: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByThirdPartyInfo({
            thirdPartyId,
            thirdPartyUserId,
        });
    }

    static signUp(email: string, password: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signUp({ email, password });
    }

    static signIn(email: string, password: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signIn({ email, password });
    }

    static getUserById(userId: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId });
    }

    static getUsersByEmail(email: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersByEmail({ email });
    }

    /**
     * @deprecated Use supertokens.getUsersByEmail(...) function instead IF using core version >= 3.5
     *   */
    static getUserByEmail(email: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByEmail({ email });
    }

    static createResetPasswordToken(userId: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({ userId });
    }

    static resetPasswordUsingToken(token: string, newPassword: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.resetPasswordUsingToken({ token, newPassword });
    }

    /**
     * @deprecated Use supertokens.getUsersOldestFirst(...) function instead IF using core version >= 3.5
     *   */
    static getUsersOldestFirst(limit?: number, nextPaginationToken?: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersOldestFirst({ limit, nextPaginationToken });
    }

    /**
     * @deprecated Use supertokens.getUsersNewestFirst(...) function instead IF using core version >= 3.5
     *   */
    static getUsersNewestFirst(limit?: number, nextPaginationToken?: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersNewestFirst({ limit, nextPaginationToken });
    }

    /**
     * @deprecated Use supertokens.getUserCount(...) function instead IF using core version >= 3.5
     *   */
    static getUserCount() {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserCount();
    }

    static updateEmailOrPassword(input: { userId: string; email?: string; password?: string }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateEmailOrPassword(input);
    }

    static async createEmailVerificationToken(userId: string) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.createEmailVerificationToken({
            userId,
            email: await recipeInstance.getEmailForUserId(userId),
        });
    }

    static async verifyEmailUsingToken(token: string) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        let response = await recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.verifyEmailUsingToken({
            token,
        });
        if (response.status === "OK") {
            let userInThisRecipe = await recipeInstance.recipeInterfaceImpl.getUserById({ userId: response.user.id });
            return userInThisRecipe;
        }
        return response;
    }

    static async isEmailVerified(userId: string) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.isEmailVerified({
            userId,
            email: await recipeInstance.getEmailForUserId(userId),
        });
    }

    static async revokeEmailVerificationTokens(userId: string) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.revokeEmailVerificationTokens({
            userId,
            email: await recipeInstance.getEmailForUserId(userId),
        });
    }

    static async unverifyEmail(userId: string) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.unverifyEmail({
            userId,
            email: await recipeInstance.getEmailForUserId(userId),
        });
    }

    static Google = thirdPartyProviders.Google;

    static Github = thirdPartyProviders.Github;

    static Facebook = thirdPartyProviders.Facebook;

    static Apple = thirdPartyProviders.Apple;
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let signUp = Wrapper.signUp;

export let signIn = Wrapper.signIn;

export let signInUp = Wrapper.signInUp;

export let getUserById = Wrapper.getUserById;

export let getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo;

/**
 * @deprecated Use supertokens.getUsersByEmail(...) function instead IF using core version >= 3.5
 *   */
export let getUserByEmail = Wrapper.getUserByEmail;

export let getUsersByEmail = Wrapper.getUsersByEmail;

export let createResetPasswordToken = Wrapper.createResetPasswordToken;

export let resetPasswordUsingToken = Wrapper.resetPasswordUsingToken;

export let createEmailVerificationToken = Wrapper.createEmailVerificationToken;

export let verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;

export let isEmailVerified = Wrapper.isEmailVerified;

export let revokeEmailVerificationTokens = Wrapper.revokeEmailVerificationTokens;

export let unverifyEmail = Wrapper.unverifyEmail;

/**
 * @deprecated Use supertokens.getUsersOldestFirst(...) function instead IF using core version >= 3.5
 *   */
export let getUsersOldestFirst = Wrapper.getUsersOldestFirst;

/**
 * @deprecated Use supertokens.getUsersNewestFirst(...) function instead IF using core version >= 3.5
 *   */
export let getUsersNewestFirst = Wrapper.getUsersNewestFirst;

/**
 * @deprecated Use supertokens.getUserCount(...) function instead IF using core version >= 3.5
 *   */
export let getUserCount = Wrapper.getUserCount;

export let updateEmailOrPassword = Wrapper.updateEmailOrPassword;

export let Google = Wrapper.Google;

export let Github = Wrapper.Github;

export let Facebook = Wrapper.Facebook;

export let Apple = Wrapper.Apple;

export type { RecipeInterface, TypeProvider, User, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions };
