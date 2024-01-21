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
import { getRequestFromUserContext, getUser } from "../..";
import { getUserContext } from "../../utils";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async thirdPartyGetProvider(
        tenantId: string,
        thirdPartyId: string,
        clientType: string | undefined,
        userContext?: Record<string, any>
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyGetProvider({
            thirdPartyId,
            clientType,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static thirdPartyManuallyCreateOrUpdateUser(
        tenantId: string,
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        shouldAttemptAccountLinkingIfAllowed?: boolean,
        userContext?: Record<string, any>
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyManuallyCreateOrUpdateUser({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            tenantId,
            shouldAttemptAccountLinkingIfAllowed: shouldAttemptAccountLinkingIfAllowed ?? true,
            userContext: getUserContext(userContext),
        });
    }

    static emailPasswordSignUp(tenantId: string, email: string, password: string, userContext?: Record<string, any>) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.emailPasswordSignUp({
            email,
            password,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static emailPasswordSignIn(tenantId: string, email: string, password: string, userContext?: Record<string, any>) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.emailPasswordSignIn({
            email,
            password,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static createResetPasswordToken(
        tenantId: string,
        userId: string,
        email: string,
        userContext?: Record<string, any>
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            email,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async resetPasswordUsingToken(
        tenantId: string,
        token: string,
        newPassword: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
          }
        | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
    > {
        const consumeResp = await Wrapper.consumePasswordResetToken(tenantId, token, userContext);

        if (consumeResp.status !== "OK") {
            return consumeResp;
        }

        let result = await Wrapper.updateEmailOrPassword({
            recipeUserId: new RecipeUserId(consumeResp.userId),
            email: consumeResp.email,
            password: newPassword,
            tenantIdForPasswordPolicy: tenantId,
            userContext,
        });

        if (result.status === "EMAIL_ALREADY_EXISTS_ERROR" || result.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
            throw new global.Error("Should never come here cause we are not updating email");
        }
        if (result.status === "PASSWORD_POLICY_VIOLATED_ERROR") {
            return {
                status: "PASSWORD_POLICY_VIOLATED_ERROR",
                failureReason: result.failureReason,
            };
        }
        return {
            status: result.status,
        };
    }

    static consumePasswordResetToken(tenantId: string, token: string, userContext?: Record<string, any>) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumePasswordResetToken({
            token,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static updateEmailOrPassword(input: {
        recipeUserId: RecipeUserId;
        email?: string;
        password?: string;
        userContext?: Record<string, any>;
        applyPasswordPolicy?: boolean;
        tenantIdForPasswordPolicy?: string;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateEmailOrPassword({
            ...input,
            userContext: getUserContext(input.userContext),
            tenantIdForPasswordPolicy:
                input.tenantIdForPasswordPolicy === undefined ? DEFAULT_TENANT_ID : input.tenantIdForPasswordPolicy,
        });
    }

    static async createResetPasswordLink(
        tenantId: string,
        userId: string,
        email: string,
        userContext?: Record<string, any>
    ): Promise<{ status: "OK"; link: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
        const ctx = getUserContext(userContext);
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
                tenantId,
                request: getRequestFromUserContext(ctx),
                userContext: ctx,
            }),
        };
    }

    static async sendResetPasswordEmail(
        tenantId: string,
        userId: string,
        email: string,
        userContext?: Record<string, any>
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

    static async sendEmail(input: TypeEmailPasswordEmailDeliveryInput & { userContext?: Record<string, any> }) {
        return await Recipe.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail({
            ...input,
            userContext: getUserContext(input.userContext),
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

export let resetPasswordUsingToken = Wrapper.resetPasswordUsingToken;

export let consumePasswordResetToken = Wrapper.consumePasswordResetToken;

export let updateEmailOrPassword = Wrapper.updateEmailOrPassword;

export type { RecipeInterface, TypeProvider, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions };

export let createResetPasswordLink = Wrapper.createResetPasswordLink;

export let sendResetPasswordEmail = Wrapper.sendResetPasswordEmail;

export let sendEmail = Wrapper.sendEmail;
