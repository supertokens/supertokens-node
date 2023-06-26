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
import { User } from "../../types";
import { SessionContainerInterface } from "../session/types";
import { linkAccountsWithUserFromSession } from "../accountlinking";
import RecipeUserId from "../../recipeUserId";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static signUp(email: string, password: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
            email,
            password,
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

    static consumePasswordResetToken(token: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumePasswordResetToken({
            token,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static getPasswordResetTokenInfo(token: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getPasswordResetTokenInfo({
            token,
            userContext: userContext === undefined ? {} : userContext,
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

    static async sendEmail(input: TypeEmailPasswordEmailDeliveryInput & { userContext?: any }) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail({
            userContext: {},
            ...input,
        });
    }

    /**
     * This function is similar to linkAccounts, but it specifically
     * works for when trying to link accounts with a user that you are already logged
     * into. This can be used to implement, for example, connecting social accounts to your *
     * existing email password account.
     *
     * This function also creates a new recipe user for the newUser if required.
     */
    static async linkEmailPasswordAccountsWithUserFromSession(input: {
        session: SessionContainerInterface;
        email: string;
        password: string;
        userContext?: any;
    }): Promise<
        | {
              status: "OK";
              wereAccountsAlreadyLinked: boolean;
          }
        | {
              status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
              description: string;
          }
        | {
              status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR";
              primaryUserId: string;
              recipeUserId: RecipeUserId;
              email: string;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    > {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        const createRecipeUserFunc = async (userContext: any): Promise<void> => {
            await recipeInstance.recipeInterfaceImpl.createNewRecipeUser({
                email: input.email,
                password: input.password,
                userContext,
            });
            // we ignore the result from the above cause after this, function returns,
            // the linkAccountsWithUserFromSession anyway does recursion..
        };

        const verifyCredentialsFunc = async (
            userContext: any
        ): Promise<
            | { status: "OK" }
            | {
                  status: "CUSTOM_RESPONSE";
                  resp: {
                      status: "WRONG_CREDENTIALS_ERROR";
                  };
              }
        > => {
            const signInResult = await recipeInstance.recipeInterfaceImpl.signIn({
                email: input.email,
                password: input.password,
                userContext,
            });

            if (signInResult.status === "OK") {
                return { status: "OK" };
            } else {
                return {
                    status: "CUSTOM_RESPONSE",
                    resp: signInResult,
                };
            }
        };

        let response = await linkAccountsWithUserFromSession({
            session: input.session,
            newUser: {
                recipeId: "emailpassword",
                email: input.email,
            },
            createRecipeUserFunc,
            verifyCredentialsFunc,
            userContext: input.userContext === undefined ? {} : input.userContext,
        });
        if (response.status === "CUSTOM_RESPONSE") {
            return response.resp;
        }
        if (response.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR") {
            return {
                status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                primaryUserId: response.primaryUserId,
                recipeUserId: response.recipeUserId,
                email: input.email,
            };
        }
        return response;
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let signUp = Wrapper.signUp;

export let signIn = Wrapper.signIn;

export let createResetPasswordToken = Wrapper.createResetPasswordToken;

export let consumePasswordResetToken = Wrapper.consumePasswordResetToken;

export let updateEmailOrPassword = Wrapper.updateEmailOrPassword;

export let linkEmailPasswordAccountsWithUserFromSession = Wrapper.linkEmailPasswordAccountsWithUserFromSession;

export let getPasswordResetTokenInfo = Wrapper.getPasswordResetTokenInfo;

export type { RecipeInterface, User, APIOptions, APIInterface };

export let sendEmail = Wrapper.sendEmail;
