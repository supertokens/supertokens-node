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
import * as thirdPartyProviders from "./providers";
import { RecipeInterface, User, APIInterface, APIOptions, TypeProvider } from "./types";
import { TypeEmailVerificationEmailDeliveryInput } from "../emailverification/types";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async signInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        },
        userContext: any = {}
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signInUp({
            thirdPartyId,
            thirdPartyUserId,
            email,
            userContext,
        });
    }

    static getUserById(userId: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId, userContext });
    }

    static getUsersByEmail(email: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersByEmail({ email, userContext });
    }

    static getUserByThirdPartyInfo(thirdPartyId: string, thirdPartyUserId: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByThirdPartyInfo({
            thirdPartyId,
            thirdPartyUserId,
            userContext,
        });
    }

    static async createEmailVerificationToken(userId: string, userContext: any = {}) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.createEmailVerificationToken({
            userId,
            email: await recipeInstance.getEmailForUserId(userId, userContext),
            userContext,
        });
    }

    static async verifyEmailUsingToken(token: string, userContext: any = {}) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        let response = await recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.verifyEmailUsingToken({
            token,
            userContext,
        });
        if (response.status === "OK") {
            let userInThisRecipe = await recipeInstance.recipeInterfaceImpl.getUserById({
                userId: response.user.id,
                userContext,
            });
            return userInThisRecipe;
        }
        return response;
    }

    static async isEmailVerified(userId: string, userContext: any = {}) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.isEmailVerified({
            userId,
            email: await recipeInstance.getEmailForUserId(userId, userContext),
            userContext,
        });
    }

    static async revokeEmailVerificationTokens(userId: string, userContext: any = {}) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.revokeEmailVerificationTokens({
            userId,
            email: await recipeInstance.getEmailForUserId(userId, userContext),
            userContext,
        });
    }

    static async unverifyEmail(userId: string, userContext: any = {}) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.unverifyEmail({
            userId,
            email: await recipeInstance.getEmailForUserId(userId, userContext),
            userContext,
        });
    }

    static Google = thirdPartyProviders.Google;

    static Github = thirdPartyProviders.Github;

    static Facebook = thirdPartyProviders.Facebook;

    static Apple = thirdPartyProviders.Apple;

    static Discord = thirdPartyProviders.Discord;

    static GoogleWorkspaces = thirdPartyProviders.GoogleWorkspaces;

    // static Okta = thirdPartyProviders.Okta;

    // static ActiveDirectory = thirdPartyProviders.ActiveDirectory;

    static async sendEmail(input: TypeEmailVerificationEmailDeliveryInput & { userContext?: any }) {
        return await Recipe.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail({
            userContext: {},
            ...input,
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let signInUp = Wrapper.signInUp;

export let getUserById = Wrapper.getUserById;

export let getUsersByEmail = Wrapper.getUsersByEmail;

export let getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo;

export let createEmailVerificationToken = Wrapper.createEmailVerificationToken;

export let verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;

export let isEmailVerified = Wrapper.isEmailVerified;

export let revokeEmailVerificationTokens = Wrapper.revokeEmailVerificationTokens;

export let unverifyEmail = Wrapper.unverifyEmail;

export let Google = Wrapper.Google;

export let Github = Wrapper.Github;

export let Facebook = Wrapper.Facebook;

export let Apple = Wrapper.Apple;

export let Discord = Wrapper.Discord;

export let GoogleWorkspaces = Wrapper.GoogleWorkspaces;

// export let Okta = Wrapper.Okta;

// export let ActiveDirectory = Wrapper.ActiveDirectory;

export type { RecipeInterface, User, APIInterface, APIOptions, TypeProvider };

export let sendEmail = Wrapper.sendEmail;
