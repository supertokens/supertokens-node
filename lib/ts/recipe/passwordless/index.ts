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
import { RecipeInterface, User, APIOptions, APIInterface } from "./types";

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
        ) & { userInputCode?: string },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createCode(input, userContext);
    }

    static createNewCodeForDevice(
        input: {
            deviceId: string;
            userInputCode?: string;
        },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewCodeForDevice(input, userContext);
    }

    static consumeCode(
        input:
            | {
                  preAuthSessionId: string;
                  userInputCode: string;
                  deviceId: string;
              }
            | {
                  preAuthSessionId: string;
                  linkCode: string;
              },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumeCode(input, userContext);
    }

    static getUserById(
        input: {
            userId: string;
        },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById(input, userContext);
    }

    static getUserByEmail(
        input: {
            email: string;
        },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByEmail(input, userContext);
    }

    static getUserByPhoneNumber(
        input: {
            phoneNumber: string;
        },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByPhoneNumber(input, userContext);
    }

    static updateUser(
        input: {
            userId: string;
            email?: string | null;
            phoneNumber?: string | null;
        },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateUser(input, userContext);
    }

    static revokeAllCodes(
        input:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllCodes(input, userContext);
    }

    static revokeCode(
        input: {
            codeId: string;
        },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeCode(input, userContext);
    }

    static listCodesByEmail(
        input: {
            email: string;
        },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByEmail(input, userContext);
    }

    static listCodesByPhoneNumber(
        input: {
            phoneNumber: string;
        },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPhoneNumber(input, userContext);
    }

    static listCodesByDeviceId(
        input: {
            deviceId: string;
        },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByDeviceId(input, userContext);
    }

    static listCodesByPreAuthSessionId(
        input: {
            preAuthSessionId: string;
        },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPreAuthSessionId(input, userContext);
    }

    static createMagicLink(
        input:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().createMagicLink(input, userContext);
    }

    static signInUp(
        input:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              },
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().signInUp(input, userContext);
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
