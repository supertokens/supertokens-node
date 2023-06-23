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
import TotpRecipe from "../recipe";
import SessionError from "../../session/error";
// import '../../mfa'

// import { completeFactorInSession } from '../../mfa';

export default function getAPIImplementation(): APIInterface {
    return {
        createDevicePOST: async function ({ session, options, deviceName, userContext }) {
            let userIdentifierInfo: string | undefined = undefined;
            const emailOrPhoneInfo = await TotpRecipe.getInstanceOrThrowError().getUserIdentifierInfoForUserId(
                session.getUserId(),
                userContext
            );
            if (emailOrPhoneInfo.status === "OK") {
                userIdentifierInfo = emailOrPhoneInfo.info;
            } else if (emailOrPhoneInfo.status === "UNKNOWN_USER_ID_ERROR") {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Unknown User ID provided",
                });
            }

            let existingDeviceCount = 0;
            if (deviceName === undefined) {
                // We need to set the device name:
                const listDevicesResponse = await options.recipeImplementation.listDevices({
                    userId: session.getUserId(),
                    userContext,
                });
                existingDeviceCount = listDevicesResponse.status === "OK" ? listDevicesResponse.devices.length : 0;
                deviceName = `TOTP Device ${existingDeviceCount + 1}`; // Assuming no one creates a device in the same format
            }

            if (existingDeviceCount > 0) {
                // TODO: We need to assert that all factors have been completed
                // before actually creating the device.
                // await session.assertClaims(MfaClaim.validators.hasCompletedAllFactors(), userContext);
            }

            const args = { deviceName, userId: session.getUserId(), userIdentifierInfo, userContext };
            let response = await options.recipeImplementation.createDevice(args);
            return { ...response, deviceName };
        },

        verifyCodePOST: async function ({ session, options, totp, userContext }) {
            const args = { userId: session.getUserId(), totp, userContext };
            let response = await options.recipeImplementation.verifyCode(args);

            if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                throw new STError({
                    type: "TOTP_NOT_ENABLED_ERROR",
                    message: "TOTP is not enabled for this user",
                });
            }

            // TODO: Uncomment when MFA is implemented
            // userContext.flow = 'signin';
            // await completeFactorInSession(session, 'totp', userContext);

            return response;
        },

        verifyDevicePOST: async function ({ session, options, deviceName, totp, userContext }) {
            const args = { userId: session.getUserId(), deviceName, totp, userContext };
            let response = await options.recipeImplementation.verifyDevice(args);

            if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                throw new STError({
                    type: STError.TOTP_NOT_ENABLED_ERROR,
                    message: "TOTP is not enabled for this user",
                });
            }

            // TODO: Uncomment when MFA is implemented
            // userContext.flow = 'signup';
            // await completeFactorInSession(session, 'totp', userContext);

            return response;
        },

        removeDevicePOST: async function ({ session, options, deviceName, userContext }) {
            const args = { userId: session.getUserId(), deviceName, userContext };
            let response = await options.recipeImplementation.removeDevice(args);

            if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                throw new STError({
                    type: "TOTP_NOT_ENABLED_ERROR",
                    message: "TOTP is not enabled for this user",
                });
            }

            return response;
        },

        listDevicesGET: async function ({ session, options, userContext }) {
            const args = { userId: session.getUserId(), userContext };
            let response = await options.recipeImplementation.listDevices(args);

            if (response.status === "TOTP_NOT_ENABLED_ERROR") {
                throw new STError({
                    type: "TOTP_NOT_ENABLED_ERROR",
                    message: "TOTP is not enabled for this user",
                });
            }

            return response;
        },
    };
}
