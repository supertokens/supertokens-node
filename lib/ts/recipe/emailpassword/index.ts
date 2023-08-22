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
import { RecipeInterface, APIOptions, APIInterface, TypeEmailPasswordEmailDeliveryInput } from "./types";
import RecipeUserId from "../../recipeUserId";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { getPasswordResetLink } from "./utils";
import { getUser } from "../..";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static signUp(tenantId: string, email: string, password: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
            email,
            password,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static signIn(tenantId: string, email: string, password: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signIn({
            email,
            password,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
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
    static createResetPasswordToken(tenantId: string, userId: string, email: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            email,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static consumePasswordResetToken(tenantId: string, token: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumePasswordResetToken({
            token,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static updateEmailOrPassword(input: {
        recipeUserId: RecipeUserId;
        email?: string;
        password?: string;
        userContext?: any;
        applyPasswordPolicy?: boolean;
        tenantIdForPasswordPolicy?: string;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateEmailOrPassword({
            ...input,
            userContext: input.userContext ?? {},
            tenantIdForPasswordPolicy:
                input.tenantIdForPasswordPolicy === undefined ? DEFAULT_TENANT_ID : input.tenantIdForPasswordPolicy,
        });
    }

    static async createResetPasswordLink(
        tenantId: string,
        userId: string,
        email: string,
        userContext: any = {}
    ): Promise<{ status: "OK"; link: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
        let token = await createResetPasswordToken(tenantId, userId, email, userContext);
        if (token.status === "UNKNOWN_USER_ID_ERROR") {
            return token;
        }

        const recipeInstance = Recipe.getInstanceOrThrowError();
        return {
            status: "OK",
            link: getPasswordResetLink({
                appInfo: recipeInstance.getAppInfo(),
                recipeId: recipeInstance.getRecipeId(),
                token: token.token,
                tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            }),
        };
    }

    static async sendResetPasswordEmail(
        tenantId: string,
        userId: string,
        email: string,
        userContext: any = {}
    ): Promise<{ status: "OK" | "UNKNOWN_USER_ID_ERROR" }> {
        const user = await getUser(userId, userContext);
        if (!user) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }

        const loginMethod = user.loginMethods.find((m) => m.recipeId === "emailpassword" && m.hasSameEmailAs(email));
        if (!loginMethod) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }

        let link = await createResetPasswordLink(tenantId, userId, email, userContext);
        if (link.status === "UNKNOWN_USER_ID_ERROR") {
            return link;
        }

        await sendEmail({
            passwordResetLink: link.link,
            type: "PASSWORD_RESET",
            user: {
                id: user.id,
                recipeUserId: loginMethod.recipeUserId,
                email: loginMethod.email!,
            },
            tenantId,
            userContext,
        });

        return {
            status: "OK",
        };
    }

    static async sendEmail(input: TypeEmailPasswordEmailDeliveryInput & { userContext?: any }) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail({
            userContext: {},
            ...input,
            tenantId: input.tenantId === undefined ? DEFAULT_TENANT_ID : input.tenantId,
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let signUp = Wrapper.signUp;

export let signIn = Wrapper.signIn;

export let createResetPasswordToken = Wrapper.createResetPasswordToken;

export let consumePasswordResetToken = Wrapper.consumePasswordResetToken;

export let updateEmailOrPassword = Wrapper.updateEmailOrPassword;

export type { RecipeInterface, APIOptions, APIInterface };

export let createResetPasswordLink = Wrapper.createResetPasswordLink;

export let sendResetPasswordEmail = Wrapper.sendResetPasswordEmail;

export let sendEmail = Wrapper.sendEmail;
