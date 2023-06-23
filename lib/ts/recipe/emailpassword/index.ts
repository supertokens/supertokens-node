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

    static signUp(email: string, password: string, tenantId?: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
            email,
            password,
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static signIn(email: string, password: string, tenantId?: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signIn({
            email,
            password,
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static getUserById(userId: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({
            userId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static getUserByEmail(email: string, tenantId?: undefined, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByEmail({
            email,
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static createResetPasswordToken(userId: string, tenantId?: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static resetPasswordUsingToken(token: string, newPassword: string, tenantId?: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.resetPasswordUsingToken({
            token,
            newPassword,
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static updateEmailOrPassword(input: {
        userId: string;
        email?: string;
        password?: string;
        userContext?: any;
        applyPasswordPolicy?: boolean;
    }) {
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
