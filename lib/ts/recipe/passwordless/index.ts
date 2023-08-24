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
    TypePasswordlessEmailDeliveryInput,
    TypePasswordlessSmsDeliveryInput,
} from "./types";
import RecipeUserId from "../../recipeUserId";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static createCode(
        input: (
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              }
        ) & { tenantId: string; userInputCode?: string; userContext?: any }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createCode({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static createNewCodeForDevice(input: {
        deviceId: string;
        userInputCode?: string;
        tenantId: string;
        userContext?: any;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewCodeForDevice({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static consumeCode(
        input:
            | {
                  preAuthSessionId: string;
                  userInputCode: string;
                  deviceId: string;
                  tenantId: string;
                  userContext?: any;
              }
            | {
                  preAuthSessionId: string;
                  linkCode: string;
                  tenantId: string;
                  userContext?: any;
              }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumeCode({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static updateUser(input: {
        recipeUserId: RecipeUserId;
        email?: string | null;
        phoneNumber?: string | null;
        userContext?: any;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateUser({ userContext: {}, ...input });
    }

    static revokeAllCodes(
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext?: any;
              }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllCodes({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static revokeCode(input: { codeId: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeCode({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static listCodesByEmail(input: { email: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByEmail({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static listCodesByPhoneNumber(input: { phoneNumber: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPhoneNumber({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static listCodesByDeviceId(input: { deviceId: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByDeviceId({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static listCodesByPreAuthSessionId(input: { preAuthSessionId: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPreAuthSessionId({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static createMagicLink(
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext?: any;
              }
    ) {
        return Recipe.getInstanceOrThrowError().createMagicLink({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static signInUp(
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext?: any;
              }
    ) {
        return Recipe.getInstanceOrThrowError().signInUp({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static async sendEmail(input: TypePasswordlessEmailDeliveryInput & { userContext?: any }) {
        return await Recipe.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail({
            ...input,
            userContext: input.userContext ?? {},
        });
    }

    static async sendSms(input: TypePasswordlessSmsDeliveryInput & { userContext?: any }) {
        return await Recipe.getInstanceOrThrowError().smsDelivery.ingredientInterfaceImpl.sendSms({
            ...input,
            userContext: input.userContext ?? {},
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let createCode = Wrapper.createCode;

export let consumeCode = Wrapper.consumeCode;

export let listCodesByDeviceId = Wrapper.listCodesByDeviceId;

export let listCodesByEmail = Wrapper.listCodesByEmail;

export let listCodesByPhoneNumber = Wrapper.listCodesByPhoneNumber;

export let listCodesByPreAuthSessionId = Wrapper.listCodesByPreAuthSessionId;

export let createNewCodeForDevice = Wrapper.createNewCodeForDevice;

export let updateUser = Wrapper.updateUser;

export let revokeAllCodes = Wrapper.revokeAllCodes;

export let revokeCode = Wrapper.revokeCode;

export let createMagicLink = Wrapper.createMagicLink;

export let signInUp = Wrapper.signInUp;

export type { RecipeInterface, APIOptions, APIInterface };

export let sendEmail = Wrapper.sendEmail;

export let sendSms = Wrapper.sendSms;
