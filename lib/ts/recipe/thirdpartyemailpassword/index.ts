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
import { RecipeInterface, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions } from "./types";
import { TypeProvider } from "../thirdparty/types";
import { TypeEmailPasswordEmailDeliveryInput } from "../emailpassword/types";
import RecipeUserId from "../../recipeUserId";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static thirdPartySignInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartySignInUp({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            userContext,
        });
    }

    static emailPasswordSignUp(email: string, password: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.emailPasswordSignUp({
            email,
            password,
            userContext,
        });
    }

    static emailPasswordSignIn(email: string, password: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.emailPasswordSignIn({
            email,
            password,
            userContext,
        });
    }

    static createResetPasswordToken(userId: string, email: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            email,
            userContext,
        });
    }

    static consumePasswordResetToken(token: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumePasswordResetToken({
            token,
            userContext,
        });
    }

    static getPasswordResetTokenInfo(token: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getPasswordResetTokenInfo({
            token,
            userContext,
        });
    }

    static updateEmailOrPassword(input: {
        recipeUserId: RecipeUserId;
        email?: string;
        password?: string;
        userContext?: any;
        applyPasswordPolicy?: boolean;
    }) {
        if (typeof input.recipeUserId === "string" && process.env.TEST_MODE === "testing") {
            // This is there cause for tests, we pass in a string in most tests.
            input.recipeUserId = new RecipeUserId(input.recipeUserId);
        }
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateEmailOrPassword({
            userContext: {},
            ...input,
        });
    }

    static Google = thirdPartyProviders.Google;

    static Github = thirdPartyProviders.Github;

    static Facebook = thirdPartyProviders.Facebook;

    static Apple = thirdPartyProviders.Apple;

    static Discord = thirdPartyProviders.Discord;

    static GoogleWorkspaces = thirdPartyProviders.GoogleWorkspaces;

    static Bitbucket = thirdPartyProviders.Bitbucket;

    static GitLab = thirdPartyProviders.GitLab;

    // static Okta = thirdPartyProviders.Okta;

    // static ActiveDirectory = thirdPartyProviders.ActiveDirectory;

    static async sendEmail(input: TypeEmailPasswordEmailDeliveryInput & { userContext?: any }) {
        return await Recipe.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail({
            userContext: {},
            ...input,
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let emailPasswordSignUp = Wrapper.emailPasswordSignUp;

export let emailPasswordSignIn = Wrapper.emailPasswordSignIn;

export let thirdPartySignInUp = Wrapper.thirdPartySignInUp;

export let createResetPasswordToken = Wrapper.createResetPasswordToken;

export let consumePasswordResetToken = Wrapper.consumePasswordResetToken;

export let updateEmailOrPassword = Wrapper.updateEmailOrPassword;

export let getPasswordResetTokenInfo = Wrapper.getPasswordResetTokenInfo;

export let Google = Wrapper.Google;

export let Github = Wrapper.Github;

export let Facebook = Wrapper.Facebook;

export let Apple = Wrapper.Apple;

export let Discord = Wrapper.Discord;

export let GoogleWorkspaces = Wrapper.GoogleWorkspaces;

export let Bitbucket = Wrapper.Bitbucket;

export let GitLab = Wrapper.GitLab;

// export let Okta = Wrapper.Okta;

// export let ActiveDirectory = Wrapper.ActiveDirectory;

export type { RecipeInterface, TypeProvider, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions };

export let sendEmail = Wrapper.sendEmail;
