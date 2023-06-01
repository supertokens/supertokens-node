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

import { APIInterface } from "../types";
import STError from "../error";

export default function getAPIImplementation(): APIInterface {
    return {
        createDevicePOST: async function (input) {
            const { session, options, ...rest } = input;
            const args = { ...rest, userId: session.getUserId() };
            let response = await input.options.recipeImplementation.createDevice(args);

            return response;
        },

        verifyCodePOST: async function (input) {
            const { session, options, ...rest } = input;
            const args = { ...rest, userId: session.getUserId() };
            let response = await input.options.recipeImplementation.verifyCode(args);

            if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                throw new STError({
                    type: "TOTP_NOT_ENABLED_ERROR",
                    message: "TOTP is not enabled for this user",
                });
            }
            return response;
        },

        verifyDevicePOST: async function (input) {
            const { session, options, ...rest } = input;
            const args = { ...rest, userId: session.getUserId() };
            let response = await input.options.recipeImplementation.verifyDevice(args);

            if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                throw new STError({
                    type: STError.TOTP_NOT_ENABLED_ERROR,
                    message: "TOTP is not enabled for this user",
                });
            }

            return response;
        },

        removeDevicePOST: async function (input) {
            const { session, options, ...rest } = input;
            const args = { ...rest, userId: session.getUserId() };
            let response = await input.options.recipeImplementation.removeDevice(args);

            if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                throw new STError({
                    type: "TOTP_NOT_ENABLED_ERROR",
                    message: "TOTP is not enabled for this user",
                });
            }

            return response;
        },

        listDevicesGET: async function (input) {
            const { session, options, ...rest } = input;
            const args = { ...rest, userId: session.getUserId() };
            let response = await input.options.recipeImplementation.listDevices(args);

            if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                throw new STError({
                    type: "TOTP_NOT_ENABLED_ERROR",
                    message: "TOTP is not enabled for this user",
                });
            }

            return response;
        },

        isTotpEnabledGET: async function (input) {
            const { session, options, ...rest } = input;
            const args = { ...rest, userId: session.getUserId() };
            let response = await input.options.recipeImplementation.listDevices(args);

            if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                return { status: "OK", isEnabled: false };
            }

            return { status: "OK", isEnabled: true };
        },
    };
}
