/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static createDevice(input: { userId: string; deviceName: string; skew: number; period: number }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createDevice({
            userContext: {},
            ...input,
        });
    }

    static verifyDevice(input: { userId: string; deviceName: string; totp: string }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyDevice({
            userContext: {},
            ...input,
        });
    }

    static verifyCode(input: { userId: string; totp: string }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyCode({
            userContext: {},
            ...input,
        });
    }

    static updateDevice(input: { userId: string; existingDeviceName: string; newDeviceName: string }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateDevice({
            userContext: {},
            ...input,
        });
    }

    static removeDevice(input: { userId: string; deviceName: string }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removeDevice({
            userContext: {},
            ...input,
        });
    }

    static listDevices(input: { userId: string }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listDevices({
            userContext: {},
            ...input,
        });
    }
}

export let init = Wrapper.init;
export let Error = Wrapper.Error;

export let createDevice = Wrapper.createDevice;
export let verifyDevice = Wrapper.verifyDevice;
export let verifyCode = Wrapper.verifyCode;
export let updateDevice = Wrapper.updateDevice;
export let removeDevice = Wrapper.removeDevice;
export let listDevices = Wrapper.listDevices;
