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
import {
    RecipeInterface,
    User,
    APIInterface,
    PasswordlessAPIOptions,
    ThirdPartyAPIOptions,
    TypeThirdPartyPasswordlessEmailDeliveryInput,
} from "./types";
import { TypeProvider } from "../thirdparty/types";
import { TypePasswordlessSmsDeliveryInput } from "../passwordless/types";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static thirdPartySignInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartySignInUp({
            thirdPartyId,
            thirdPartyUserId,
            email,
            userContext,
        });
    }

    static getUserByThirdPartyInfo(thirdPartyId: string, thirdPartyUserId: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByThirdPartyInfo({
            thirdPartyId,
            thirdPartyUserId,
            userContext,
        });
    }

    static getUserById(userId: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId, userContext });
    }

    static getUsersByEmail(email: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersByEmail({ email, userContext });
    }

    static async createEmailVerificationToken(userId: string, userContext: any = {}) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.createEmailVerificationToken({
            userId,
            email: await recipeInstance.getEmailForUserIdForEmailVerification(userId, userContext),
            userContext,
        });
    }

    static async verifyEmailUsingToken(token: string, userContext: any = {}) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        let response = await recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.verifyEmailUsingToken({
            token,
            userContext,
        });
        if (response.status === "OK") {
            let userInThisRecipe = await recipeInstance.recipeInterfaceImpl.getUserById({
                userId: response.user.id,
                userContext,
            });
            return userInThisRecipe;
        }
        return response;
    }

    static async isEmailVerified(userId: string, userContext: any = {}) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.isEmailVerified({
            userId,
            email: await recipeInstance.getEmailForUserIdForEmailVerification(userId, userContext),
            userContext,
        });
    }

    static async revokeEmailVerificationTokens(userId: string, userContext: any = {}) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.revokeEmailVerificationTokens({
            userId,
            email: await recipeInstance.getEmailForUserIdForEmailVerification(userId, userContext),
            userContext,
        });
    }

    static async unverifyEmail(userId: string, userContext: any = {}) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailVerificationRecipe.recipeInterfaceImpl.unverifyEmail({
            userId,
            email: await recipeInstance.getEmailForUserIdForEmailVerification(userId, userContext),
            userContext,
        });
    }

    static createCode(
        input: (
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              }
        ) & { userInputCode?: string; userContext?: any }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createCode({
            userContext: {},
            ...input,
        });
    }

    static createNewCodeForDevice(input: { deviceId: string; userInputCode?: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewCodeForDevice({
            userContext: {},
            ...input,
        });
    }

    static consumeCode(
        input:
            | {
                  preAuthSessionId: string;
                  userInputCode: string;
                  deviceId: string;
                  userContext?: any;
              }
            | {
                  preAuthSessionId: string;
                  linkCode: string;
                  userContext?: any;
              }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumeCode({ userContext: {}, ...input });
    }

    static getUserByPhoneNumber(input: { phoneNumber: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByPhoneNumber({ userContext: {}, ...input });
    }

    static updatePasswordlessUser(input: {
        userId: string;
        email?: string | null;
        phoneNumber?: string | null;
        userContext?: any;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updatePasswordlessUser({
            userContext: {},
            ...input,
        });
    }

    static revokeAllCodes(
        input:
            | {
                  email: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  userContext?: any;
              }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllCodes({ userContext: {}, ...input });
    }

    static revokeCode(input: { codeId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeCode({ userContext: {}, ...input });
    }

    static listCodesByEmail(input: { email: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByEmail({ userContext: {}, ...input });
    }

    static listCodesByPhoneNumber(input: { phoneNumber: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPhoneNumber({
            userContext: {},
            ...input,
        });
    }

    static listCodesByDeviceId(input: { deviceId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByDeviceId({ userContext: {}, ...input });
    }

    static listCodesByPreAuthSessionId(input: { preAuthSessionId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPreAuthSessionId({
            userContext: {},
            ...input,
        });
    }

    static createMagicLink(
        input:
            | {
                  email: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  userContext?: any;
              }
    ) {
        return Recipe.getInstanceOrThrowError().passwordlessRecipe.createMagicLink({ userContext: {}, ...input });
    }

    static passwordlessSignInUp(
        input:
            | {
                  email: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  userContext?: any;
              }
    ) {
        return Recipe.getInstanceOrThrowError().passwordlessRecipe.signInUp({ userContext: {}, ...input });
    }

    static Google = thirdPartyProviders.Google;

    static Github = thirdPartyProviders.Github;

    static Facebook = thirdPartyProviders.Facebook;

    static Apple = thirdPartyProviders.Apple;

    static Discord = thirdPartyProviders.Discord;

    static GoogleWorkspaces = thirdPartyProviders.GoogleWorkspaces;

    // static Okta = thirdPartyProviders.Okta;

    // static ActiveDirectory = thirdPartyProviders.ActiveDirectory;

    static async sendEmail(input: TypeThirdPartyPasswordlessEmailDeliveryInput & { userContext: any }) {
        return await Recipe.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail(input);
    }

    static async sendSms(input: TypePasswordlessSmsDeliveryInput & { userContext: any }) {
        return await Recipe.getInstanceOrThrowError().smsDelivery.ingredientInterfaceImpl.sendSms(input);
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let thirdPartySignInUp = Wrapper.thirdPartySignInUp;

export let passwordlessSignInUp = Wrapper.passwordlessSignInUp;

export let getUserById = Wrapper.getUserById;

export let getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo;

export let getUsersByEmail = Wrapper.getUsersByEmail;

export let createEmailVerificationToken = Wrapper.createEmailVerificationToken;

export let verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;

export let isEmailVerified = Wrapper.isEmailVerified;

export let revokeEmailVerificationTokens = Wrapper.revokeEmailVerificationTokens;

export let unverifyEmail = Wrapper.unverifyEmail;

export let createCode = Wrapper.createCode;

export let consumeCode = Wrapper.consumeCode;

export let getUserByPhoneNumber = Wrapper.getUserByPhoneNumber;

export let listCodesByDeviceId = Wrapper.listCodesByDeviceId;

export let listCodesByEmail = Wrapper.listCodesByEmail;

export let listCodesByPhoneNumber = Wrapper.listCodesByPhoneNumber;

export let listCodesByPreAuthSessionId = Wrapper.listCodesByPreAuthSessionId;

export let createNewCodeForDevice = Wrapper.createNewCodeForDevice;

export let updatePasswordlessUser = Wrapper.updatePasswordlessUser;

export let revokeAllCodes = Wrapper.revokeAllCodes;

export let revokeCode = Wrapper.revokeCode;

export let createMagicLink = Wrapper.createMagicLink;

export let Google = Wrapper.Google;

export let Github = Wrapper.Github;

export let Facebook = Wrapper.Facebook;

export let Apple = Wrapper.Apple;

export let Discord = Wrapper.Discord;

export let GoogleWorkspaces = Wrapper.GoogleWorkspaces;

// export let Okta = Wrapper.Okta;

// export let ActiveDirectory = Wrapper.ActiveDirectory;

export type { RecipeInterface, TypeProvider, User, APIInterface, PasswordlessAPIOptions, ThirdPartyAPIOptions };

export let sendEmail = Wrapper.sendEmail;

export let sendSms = Wrapper.sendSms;
