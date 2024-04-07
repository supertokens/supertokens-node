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
import { getRequestFromUserContext, getUser } from "../..";
import { getUserContext } from "../../utils";
import { SessionContainerInterface } from "../session/types";
import { User } from "../../types";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static signUp(
        tenantId: string,
        email: string,
        password: string,
        session?: undefined,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
    >;
    static signUp(
        tenantId: string,
        email: string,
        password: string,
        session: SessionContainerInterface,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    static signUp(
        tenantId: string,
        email: string,
        password: string,
        session?: SessionContainerInterface,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
            email,
            password,
            session,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static signIn(
        tenantId: string,
        email: string,
        password: string,
        session?: undefined,
        userContext?: Record<string, any>
    ): Promise<{ status: "OK"; user: User; recipeUserId: RecipeUserId } | { status: "WRONG_CREDENTIALS_ERROR" }>;
    static signIn(
        tenantId: string,
        email: string,
        password: string,
        session: SessionContainerInterface,
        userContext?: Record<string, any>
    ): Promise<
        | { status: "OK"; user: User; recipeUserId: RecipeUserId }
        | { status: "WRONG_CREDENTIALS_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    static signIn(
        tenantId: string,
        email: string,
        password: string,
        session?: SessionContainerInterface,
        userContext?: Record<string, any>
    ): Promise<
        | { status: "OK"; user: User; recipeUserId: RecipeUserId }
        | { status: "WRONG_CREDENTIALS_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signIn({
            email,
            password,
            session,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async verifyCredentials(
        tenantId: string,
        email: string,
        password: string,
        userContext?: Record<string, any>
    ): Promise<{ status: "OK" | "WRONG_CREDENTIALS_ERROR" }> {
        const resp = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyCredentials({
            email,
            password,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: getUserContext(userContext),
        });

        // Here we intentionally skip the user and recipeUserId props, because we do not want apps to accidentally use this to sign in
        return {
            status: resp.status,
        };
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
    static createResetPasswordToken(
        tenantId: string,
        userId: string,
        email: string,
        userContext?: Record<string, any>
    ): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({
            userId,
            email,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
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

    static consumePasswordResetToken(
        tenantId: string,
        token: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              email: string;
              userId: string;
          }
        | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumePasswordResetToken({
            token,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
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
    }): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
        | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
    > {
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
        let token = await createResetPasswordToken(tenantId, userId, email, ctx);
        if (token.status === "UNKNOWN_USER_ID_ERROR") {
            return token;
        }

        const recipeInstance = Recipe.getInstanceOrThrowError();
        return {
            status: "OK",
            link: getPasswordResetLink({
                appInfo: recipeInstance.getAppInfo(),
                token: token.token,
                tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
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

    static async sendEmail(
        input: TypeEmailPasswordEmailDeliveryInput & { userContext?: Record<string, any> }
    ): Promise<void> {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail({
            ...input,
            tenantId: input.tenantId === undefined ? DEFAULT_TENANT_ID : input.tenantId,
            userContext: getUserContext(input.userContext),
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let signUp = Wrapper.signUp;

export let signIn = Wrapper.signIn;

export let verifyCredentials = Wrapper.verifyCredentials;

export let createResetPasswordToken = Wrapper.createResetPasswordToken;

export let resetPasswordUsingToken = Wrapper.resetPasswordUsingToken;

export let consumePasswordResetToken = Wrapper.consumePasswordResetToken;

export let updateEmailOrPassword = Wrapper.updateEmailOrPassword;

export type { RecipeInterface, APIOptions, APIInterface };

export let createResetPasswordLink = Wrapper.createResetPasswordLink;

export let sendResetPasswordEmail = Wrapper.sendResetPasswordEmail;

export let sendEmail = Wrapper.sendEmail;
