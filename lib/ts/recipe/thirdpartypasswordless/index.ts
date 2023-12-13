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
    APIInterface,
    PasswordlessAPIOptions,
    ThirdPartyAPIOptions,
    TypeThirdPartyPasswordlessEmailDeliveryInput,
} from "./types";
import { TypeProvider } from "../thirdparty/types";
import { TypePasswordlessSmsDeliveryInput } from "../passwordless/types";
import RecipeUserId from "../../recipeUserId";
import { getRequestFromUserContext } from "../..";
import { UserContext } from "../../types";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async thirdPartyGetProvider(
        tenantId: string,
        thirdPartyId: string,
        clientType: string | undefined,
        userContext: UserContext = {} as UserContext
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyGetProvider({
            thirdPartyId,
            tenantId,
            clientType,
            userContext,
        });
    }

    static thirdPartyManuallyCreateOrUpdateUser(
        tenantId: string,
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        userContext: UserContext = ({} as UserContext) as UserContext
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

    static createCode(
        input: (
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              }
        ) & { userInputCode?: string; tenantId: string; userContext?: UserContext }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createCode({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static createNewCodeForDevice(input: {
        deviceId: string;
        userInputCode?: string;
        tenantId: string;
        userContext?: UserContext;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewCodeForDevice({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static consumeCode(
        input:
            | {
                  preAuthSessionId: string;
                  userInputCode: string;
                  deviceId: string;
                  tenantId: string;
                  userContext?: UserContext;
              }
            | {
                  preAuthSessionId: string;
                  linkCode: string;
                  tenantId: string;
                  userContext?: UserContext;
              }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumeCode({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static updatePasswordlessUser(input: {
        recipeUserId: RecipeUserId;
        email?: string | null;
        phoneNumber?: string | null;
        userContext?: UserContext;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updatePasswordlessUser({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static revokeAllCodes(
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext?: UserContext;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext?: UserContext;
              }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllCodes({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static revokeCode(input: { codeId: string; tenantId: string; userContext?: UserContext }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeCode({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static listCodesByEmail(input: { email: string; tenantId: string; userContext?: UserContext }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByEmail({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static listCodesByPhoneNumber(input: { phoneNumber: string; tenantId: string; userContext?: UserContext }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPhoneNumber({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static listCodesByDeviceId(input: { deviceId: string; tenantId: string; userContext?: UserContext }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByDeviceId({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static listCodesByPreAuthSessionId(input: {
        preAuthSessionId: string;
        tenantId: string;
        userContext?: UserContext;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPreAuthSessionId({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static createMagicLink(
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext?: UserContext;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext?: UserContext;
              }
    ) {
        return Recipe.getInstanceOrThrowError().passwordlessRecipe.createMagicLink({
            ...input,
            request: getRequestFromUserContext(input.userContext),
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static passwordlessSignInUp(
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext?: UserContext;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext?: UserContext;
              }
    ) {
        return Recipe.getInstanceOrThrowError().passwordlessRecipe.signInUp({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static async sendEmail(input: TypeThirdPartyPasswordlessEmailDeliveryInput & { userContext?: UserContext }) {
        return await Recipe.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }

    static async sendSms(input: TypePasswordlessSmsDeliveryInput & { userContext?: UserContext }) {
        return await Recipe.getInstanceOrThrowError().smsDelivery.ingredientInterfaceImpl.sendSms({
            ...input,
            userContext: input.userContext ?? ({} as UserContext),
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let thirdPartyGetProvider = Wrapper.thirdPartyGetProvider;

export let thirdPartyManuallyCreateOrUpdateUser = Wrapper.thirdPartyManuallyCreateOrUpdateUser;

export let passwordlessSignInUp = Wrapper.passwordlessSignInUp;

export let createCode = Wrapper.createCode;

export let consumeCode = Wrapper.consumeCode;

export let listCodesByDeviceId = Wrapper.listCodesByDeviceId;

export let listCodesByEmail = Wrapper.listCodesByEmail;

export let listCodesByPhoneNumber = Wrapper.listCodesByPhoneNumber;

export let listCodesByPreAuthSessionId = Wrapper.listCodesByPreAuthSessionId;

export let createNewCodeForDevice = Wrapper.createNewCodeForDevice;

export let updatePasswordlessUser = Wrapper.updatePasswordlessUser;

export let revokeAllCodes = Wrapper.revokeAllCodes;

export let revokeCode = Wrapper.revokeCode;

export let createMagicLink = Wrapper.createMagicLink;

export type { RecipeInterface, TypeProvider, APIInterface, PasswordlessAPIOptions, ThirdPartyAPIOptions };

export let sendEmail = Wrapper.sendEmail;

export let sendSms = Wrapper.sendSms;
