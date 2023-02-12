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
import { RecipeInterface, User, APIOptions, APIInterface, TypeEmailPasswordEmailDeliveryInput } from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static signUp(email: string, password: string, doAccountLinking = false, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
            email,
            password,
            doAccountLinking,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static signIn(email: string, password: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signIn({
            email,
            password,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static getUserById(userId: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({
            userId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static getUserByEmail(email: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByEmail({
            email,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    /**
     * We do not make email optional here cause we want to
     * allow passing in primaryUserId. If we make email optional,
     * and if the user provides a primaryUserId, then it may result in two problems:
     *  - there is no recipeUserId = input primaryUserId, in this case,
     *    this function will throw an error
     *  - There is a recipe userId = input primaryUserId, but that recipe has no email,
     *    or has wrong email compared to what the user wanted to generate a reset token for.
     *
     * And we want to allow primaryUserId being passed in.
     */
    static createResetPasswordToken(userId: string, email: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            email,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static resetPasswordUsingToken(token: string, newPassword: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.resetPasswordUsingToken({
            token,
            newPassword,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static updateEmailOrPassword(input: { userId: string; email?: string; password?: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateEmailOrPassword({
            userContext: {},
            ...input,
        });
    }

    static async sendEmail(input: TypeEmailPasswordEmailDeliveryInput & { userContext?: any }) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail({
            userContext: {},
            ...input,
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

export let updateEmailOrPassword = Wrapper.updateEmailOrPassword;

export type { RecipeInterface, User, APIOptions, APIInterface };

export let sendEmail = Wrapper.sendEmail;
