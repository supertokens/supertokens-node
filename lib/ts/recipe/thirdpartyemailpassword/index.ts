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
import { RecipeInterface, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions } from "./types";
import { TypeProvider } from "../thirdparty/types";
import { TypeEmailPasswordEmailDeliveryInput } from "../emailpassword/types";
import RecipeUserId from "../../recipeUserId";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { getPasswordResetLink } from "../emailpassword/utils";
import { getUser } from "../..";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async thirdPartyGetProvider(
        tenantId: string,
        thirdPartyId: string,
        clientType: string | undefined,
        userContext: any = {}
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyGetProvider({
            thirdPartyId,
            clientType,
            tenantId,
            userContext,
        });
    }

    static thirdPartyManuallyCreateOrUpdateUser(
        tenantId: string,
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyManuallyCreateOrUpdateUser({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            tenantId,
            userContext,
        });
    }

    static emailPasswordSignUp(tenantId: string, email: string, password: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.emailPasswordSignUp({
            email,
            password,
            tenantId,
            userContext,
        });
    }

    static emailPasswordSignIn(tenantId: string, email: string, password: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.emailPasswordSignIn({
            email,
            password,
            tenantId,
            userContext,
        });
    }

    static createResetPasswordToken(tenantId: string, userId: string, email: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            email,
            tenantId,
            userContext,
        });
    }

    static consumePasswordResetToken(tenantId: string, token: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumePasswordResetToken({
            token,
            tenantId,
            userContext,
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
        if (typeof input.recipeUserId === "string" && process.env.TEST_MODE === "testing") {
            // This is there cause for tests, we pass in a string in most tests.
            input.recipeUserId = new RecipeUserId(input.recipeUserId);
        }
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
        let token = await createResetPasswordToken(userId, tenantId, email, userContext);
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
                tenantId,
            }),
        };
    }

    static async sendResetPasswordEmail(
        tenantId: string,
        userId: string,
        email: string,
        userContext: any = {}
    ): Promise<{ status: "OK" | "UNKNOWN_USER_ID_ERROR" }> {
        let link = await createResetPasswordLink(userId, tenantId, email, userContext);
        if (link.status === "UNKNOWN_USER_ID_ERROR") {
            return link;
        }

        const user = await getUser(userId, userContext);
        if (!user) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }

        const loginMethod = user.loginMethods.find((m) => m.recipeId === "emailpassword" && m.hasSameEmailAs(email));
        if (!loginMethod) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }

        await sendEmail({
            passwordResetLink: link.link,
            type: "PASSWORD_RESET",
            user: {
                email: loginMethod.email!,
                id: user.id,
                recipeUserId: loginMethod.recipeUserId,
            },
            tenantId,
            userContext,
        });

        return {
            status: "OK",
        };
    }

    static async sendEmail(input: TypeEmailPasswordEmailDeliveryInput & { userContext?: any }) {
        return await Recipe.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail({
            ...input,
            userContext: input.userContext ?? {},
            tenantId: input.tenantId === undefined ? DEFAULT_TENANT_ID : input.tenantId,
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let emailPasswordSignUp = Wrapper.emailPasswordSignUp;

export let emailPasswordSignIn = Wrapper.emailPasswordSignIn;

export let thirdPartyGetProvider = Wrapper.thirdPartyGetProvider;

export let thirdPartyManuallyCreateOrUpdateUser = Wrapper.thirdPartyManuallyCreateOrUpdateUser;

export let createResetPasswordToken = Wrapper.createResetPasswordToken;

export let consumePasswordResetToken = Wrapper.consumePasswordResetToken;

export let updateEmailOrPassword = Wrapper.updateEmailOrPassword;

export type { RecipeInterface, TypeProvider, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions };

export let createResetPasswordLink = Wrapper.createResetPasswordLink;

export let sendResetPasswordEmail = Wrapper.sendResetPasswordEmail;

export let sendEmail = Wrapper.sendEmail;
