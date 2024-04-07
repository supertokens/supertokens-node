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
import {
    RecipeInterface,
    APIOptions,
    APIInterface,
    UserEmailInfo,
    TypeEmailVerificationEmailDeliveryInput,
} from "./types";
import { EmailVerificationClaim } from "./emailVerificationClaim";
import RecipeUserId from "../../recipeUserId";
import { getEmailVerifyLink } from "./utils";
import { getRequestFromUserContext } from "../..";
import { getUserContext } from "../../utils";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static EmailVerificationClaim = EmailVerificationClaim;

    static async createEmailVerificationToken(
        tenantId: string,
        recipeUserId: RecipeUserId,
        email?: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              token: string;
          }
        | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
    > {
        const ctx = getUserContext(userContext);
        const recipeInstance = Recipe.getInstanceOrThrowError();

        if (email === undefined) {
            const emailInfo = await recipeInstance.getEmailForRecipeUserId(undefined, recipeUserId, ctx);
            if (emailInfo.status === "OK") {
                email = emailInfo.email;
            } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                return {
                    status: "EMAIL_ALREADY_VERIFIED_ERROR",
                };
            } else {
                throw new global.Error("Unknown User ID provided without email");
            }
        }

        return await recipeInstance.recipeInterfaceImpl.createEmailVerificationToken({
            recipeUserId,
            email: email!,
            tenantId,
            userContext: ctx,
        });
    }

    static async createEmailVerificationLink(
        tenantId: string,
        recipeUserId: RecipeUserId,
        email?: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              link: string;
          }
        | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
    > {
        const ctx = getUserContext(userContext);
        const recipeInstance = Recipe.getInstanceOrThrowError();
        const appInfo = recipeInstance.getAppInfo();

        let emailVerificationToken = await createEmailVerificationToken(tenantId, recipeUserId, email, ctx);
        if (emailVerificationToken.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            return {
                status: "EMAIL_ALREADY_VERIFIED_ERROR",
            };
        }

        return {
            status: "OK",
            link: getEmailVerifyLink({
                appInfo,
                token: emailVerificationToken.token,
                tenantId,
                request: getRequestFromUserContext(ctx),
                userContext: ctx,
            }),
        };
    }

    static async sendEmailVerificationEmail(
        tenantId: string,
        userId: string,
        recipeUserId: RecipeUserId,
        email?: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
          }
        | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
    > {
        const ctx = getUserContext(userContext);
        if (email === undefined) {
            const recipeInstance = Recipe.getInstanceOrThrowError();

            const emailInfo = await recipeInstance.getEmailForRecipeUserId(undefined, recipeUserId, ctx);
            if (emailInfo.status === "OK") {
                email = emailInfo.email;
            } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                return {
                    status: "EMAIL_ALREADY_VERIFIED_ERROR",
                };
            } else {
                throw new global.Error("Unknown User ID provided without email");
            }
        }

        let emailVerificationLink = await this.createEmailVerificationLink(tenantId, recipeUserId, email, ctx);

        if (emailVerificationLink.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            return {
                status: "EMAIL_ALREADY_VERIFIED_ERROR",
            };
        }

        await sendEmail({
            type: "EMAIL_VERIFICATION",
            user: {
                id: userId,
                recipeUserId: recipeUserId,
                email: email!,
            },
            emailVerifyLink: emailVerificationLink.link,
            tenantId,
            userContext: ctx,
        });

        return {
            status: "OK",
        };
    }

    static async verifyEmailUsingToken(
        tenantId: string,
        token: string,
        attemptAccountLinking: boolean = true,
        userContext?: Record<string, any>
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyEmailUsingToken({
            token,
            tenantId,
            attemptAccountLinking,
            userContext: getUserContext(userContext),
        });
    }

    static async isEmailVerified(recipeUserId: RecipeUserId, email?: string, userContext?: Record<string, any>) {
        const ctx = getUserContext(userContext);
        const recipeInstance = Recipe.getInstanceOrThrowError();
        if (email === undefined) {
            const emailInfo = await recipeInstance.getEmailForRecipeUserId(undefined, recipeUserId, ctx);

            if (emailInfo.status === "OK") {
                email = emailInfo.email;
            } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                return true;
            } else {
                throw new global.Error("Unknown User ID provided without email");
            }
        }

        return await recipeInstance.recipeInterfaceImpl.isEmailVerified({
            recipeUserId,
            email,
            userContext: ctx,
        });
    }

    static async revokeEmailVerificationTokens(
        tenantId: string,
        recipeUserId: RecipeUserId,
        email?: string,
        userContext?: Record<string, any>
    ) {
        const ctx = getUserContext(userContext);
        const recipeInstance = Recipe.getInstanceOrThrowError();

        // If the dev wants to delete the tokens for an old email address of the user they can pass the address
        // but redeeming those tokens would have no effect on isEmailVerified called without the old address
        // so in general that is not necessary either.
        if (email === undefined) {
            const emailInfo = await recipeInstance.getEmailForRecipeUserId(undefined, recipeUserId, ctx);
            if (emailInfo.status === "OK") {
                email = emailInfo.email;
            } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                // This only happens for phone based passwordless users (or if the user added a custom getEmailForUserId)
                // We can return OK here, since there is no way to create an email verification token
                // if getEmailForUserId returns EMAIL_DOES_NOT_EXIST_ERROR.
                return {
                    status: "OK",
                };
            } else {
                throw new global.Error("Unknown User ID provided without email");
            }
        }
        return await recipeInstance.recipeInterfaceImpl.revokeEmailVerificationTokens({
            recipeUserId,
            email: email!,
            tenantId,
            userContext: ctx,
        });
    }

    static async unverifyEmail(recipeUserId: RecipeUserId, email?: string, userContext?: Record<string, any>) {
        const ctx = getUserContext(userContext);
        const recipeInstance = Recipe.getInstanceOrThrowError();
        if (email === undefined) {
            const emailInfo = await recipeInstance.getEmailForRecipeUserId(undefined, recipeUserId, ctx);
            if (emailInfo.status === "OK") {
                email = emailInfo.email;
            } else if (emailInfo.status === "EMAIL_DOES_NOT_EXIST_ERROR") {
                // Here we are returning OK since that's how it used to work, but a later call to isVerified will still return true
                return {
                    status: "OK",
                };
            } else {
                throw new global.Error("Unknown User ID provided without email");
            }
        }
        return await recipeInstance.recipeInterfaceImpl.unverifyEmail({
            recipeUserId,
            email,
            userContext: ctx,
        });
    }

    static async sendEmail(input: TypeEmailVerificationEmailDeliveryInput & { userContext?: Record<string, any> }) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let createEmailVerificationToken = Wrapper.createEmailVerificationToken;

export let createEmailVerificationLink = Wrapper.createEmailVerificationLink;

export let sendEmailVerificationEmail = Wrapper.sendEmailVerificationEmail;

export let verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;

export let isEmailVerified = Wrapper.isEmailVerified;

export let revokeEmailVerificationTokens = Wrapper.revokeEmailVerificationTokens;

export let unverifyEmail = Wrapper.unverifyEmail;

export type { RecipeInterface, APIOptions, APIInterface, UserEmailInfo };

export let sendEmail = Wrapper.sendEmail;

export { EmailVerificationClaim } from "./emailVerificationClaim";
