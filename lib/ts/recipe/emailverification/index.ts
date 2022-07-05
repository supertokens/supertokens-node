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
import { RecipeInterface, APIOptions, APIInterface, User, TypeEmailVerificationEmailDeliveryInput } from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async createEmailVerificationToken(userId: string, email: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createEmailVerificationToken({
            userId,
            email,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async verifyEmailUsingToken(token: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyEmailUsingToken({
            token,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async isEmailVerified(userId: string, email: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.isEmailVerified({
            userId,
            email,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async revokeEmailVerificationTokens(userId: string, email: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeEmailVerificationTokens({
            userId,
            email,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async unverifyEmail(userId: string, email: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.unverifyEmail({
            userId,
            email,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async sendEmail(input: TypeEmailVerificationEmailDeliveryInput & { userContext: any }) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail(input);
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let createEmailVerificationToken = Wrapper.createEmailVerificationToken;

export let verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;

export let isEmailVerified = Wrapper.isEmailVerified;

export let revokeEmailVerificationTokens = Wrapper.revokeEmailVerificationTokens;

export let unverifyEmail = Wrapper.unverifyEmail;

export type { RecipeInterface, APIOptions, APIInterface, User };

export let sendEmail = Wrapper.sendEmail;
