/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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

import { getUserContext } from "../../utils";
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface } from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static async createDevice(
        userId: string,
        userIdentifierInfo?: string,
        deviceName?: string,
        skew?: number,
        period?: number,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              deviceName: string;
              secret: string;
              qrCodeString: string;
          }
        | {
              status: "DEVICE_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createDevice({
            userId,
            userIdentifierInfo,
            deviceName,
            skew,
            period,
            userContext: getUserContext(userContext),
        });
    }

    static async updateDevice(
        userId: string,
        existingDeviceName: string,
        newDeviceName: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK" | "UNKNOWN_DEVICE_ERROR" | "DEVICE_ALREADY_EXISTS_ERROR";
    }> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateDevice({
            userId,
            existingDeviceName,
            newDeviceName,
            userContext: getUserContext(userContext),
        });
    }

    static async listDevices(
        userId: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        devices: {
            name: string;
            period: number;
            skew: number;
            verified: boolean;
        }[];
    }> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listDevices({
            userId,
            userContext: getUserContext(userContext),
        });
    }

    static async removeDevice(
        userId: string,
        deviceName: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        didDeviceExist: boolean;
    }> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removeDevice({
            userId,
            deviceName,
            userContext: getUserContext(userContext),
        });
    }

    static async verifyDevice(
        tenantId: string,
        userId: string,
        deviceName: string,
        totp: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              wasAlreadyVerified: boolean;
          }
        | {
              status: "UNKNOWN_DEVICE_ERROR";
          }
        | {
              status: "INVALID_TOTP_ERROR";
              currentNumberOfFailedAttempts: number;
              maxNumberOfFailedAttempts: number;
          }
        | {
              status: "LIMIT_REACHED_ERROR";
              retryAfterMs: number;
          }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyDevice({
            tenantId,
            userId,
            deviceName,
            totp,
            userContext: getUserContext(userContext),
        });
    }

    static async verifyTOTP(
        tenantId: string,
        userId: string,
        totp: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR";
          }
        | {
              status: "INVALID_TOTP_ERROR";
              currentNumberOfFailedAttempts: number;
              maxNumberOfFailedAttempts: number;
          }
        | {
              status: "LIMIT_REACHED_ERROR";
              retryAfterMs: number;
          }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyTOTP({
            tenantId,
            userId,
            totp,
            userContext: getUserContext(userContext),
        });
    }
}

export let init = Wrapper.init;

export let createDevice = Wrapper.createDevice;
export let listDevices = Wrapper.listDevices;
export let updateDevice = Wrapper.updateDevice;
export let removeDevice = Wrapper.removeDevice;
export let verifyDevice = Wrapper.verifyDevice;
export let verifyTOTP = Wrapper.verifyTOTP;

export type { RecipeInterface, APIOptions, APIInterface };
