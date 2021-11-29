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
import { RecipeInterface, User, APIOptions, APIInterface } from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static signUp(email: string, password: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signUp({ email, password });
    }

    static signIn(email: string, password: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signIn({ email, password });
    }

    static getUserById(userId: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId });
    }

    static getUserByEmail(email: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByEmail({ email });
    }

    static createResetPasswordToken(userId: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({ userId });
    }

    static resetPasswordUsingToken(token: string, newPassword: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.resetPasswordUsingToken({ token, newPassword });
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
            return await recipeInstance.recipeInterfaceImpl.getUserById({ userId: response.user.id });
        }
        return response;
    }

    static async isEmailVerified(userId: string): Promise<boolean> {
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
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let signUp = Wrapper.signUp;

export let signIn = Wrapper.signIn;

export let getUserById = Wrapper.getUserById;

export let getUserByEmail = Wrapper.getUserByEmail;

export let createResetPasswordToken = Wrapper.createResetPasswordToken;

export let resetPasswordUsingToken = Wrapper.resetPasswordUsingToken;

export let createEmailVerificationToken = Wrapper.createEmailVerificationToken;

export let verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;

export let isEmailVerified = Wrapper.isEmailVerified;

export let revokeEmailVerificationTokens = Wrapper.revokeEmailVerificationTokens;

export let unverifyEmail = Wrapper.unverifyEmail;

export let updateEmailOrPassword = Wrapper.updateEmailOrPassword;

export type { RecipeInterface, User, APIOptions, APIInterface };
