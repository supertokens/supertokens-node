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
    User,
    APIOptions,
    APIInterface,
    TypePasswordlessEmailDeliveryInput,
    TypePasswordlessSmsDeliveryInput,
} from "./types";

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
            userContext: {},
            ...input,
        });
    }

    static createNewCodeForDevice(input: {
        deviceId: string;
        userInputCode?: string;
        tenantId: string;
        userContext?: any;
    }) {
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
            userContext: {},
            ...input,
        });
    }

    static getUserById(input: { userId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userContext: {}, ...input });
    }

    static getUserByEmail(input: { email: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByEmail({
            userContext: {},
            ...input,
            tenantId: input.tenantId,
        });
    }

    static getUserByPhoneNumber(input: { phoneNumber: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByPhoneNumber({
            userContext: {},
            ...input,
            tenantId: input.tenantId,
        });
    }

    static updateUser(input: {
        userId: string;
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
            userContext: {},
            ...input,
        });
    }

    static revokeCode(input: { codeId: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeCode({
            userContext: {},
            ...input,
        });
    }

    static listCodesByEmail(input: { email: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByEmail({
            userContext: {},
            ...input,
        });
    }

    static listCodesByPhoneNumber(input: { phoneNumber: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPhoneNumber({
            userContext: {},
            ...input,
        });
    }

    static listCodesByDeviceId(input: { deviceId: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByDeviceId({
            userContext: {},
            ...input,
        });
    }

    static listCodesByPreAuthSessionId(input: { preAuthSessionId: string; tenantId: string; userContext?: any }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPreAuthSessionId({
            userContext: {},
            ...input,
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
            userContext: {},
            ...input,
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
            userContext: {},
            ...input,
        });
    }

    static async sendEmail(input: TypePasswordlessEmailDeliveryInput & { userContext?: any }) {
        return await Recipe.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail({
            userContext: {},
            ...input,
        });
    }

    static async sendSms(input: TypePasswordlessSmsDeliveryInput & { userContext?: any }) {
        return await Recipe.getInstanceOrThrowError().smsDelivery.ingredientInterfaceImpl.sendSms({
            userContext: {},
            ...input,
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let createCode = Wrapper.createCode;

export let consumeCode = Wrapper.consumeCode;

export let getUserByEmail = Wrapper.getUserByEmail;

export let getUserById = Wrapper.getUserById;

export let getUserByPhoneNumber = Wrapper.getUserByPhoneNumber;

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

export type { RecipeInterface, User, APIOptions, APIInterface };

export let sendEmail = Wrapper.sendEmail;

export let sendSms = Wrapper.sendSms;
