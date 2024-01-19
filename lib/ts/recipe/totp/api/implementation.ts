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

import { APIInterface } from "../";
import MultiFactorAuth from "../../multifactorauth";
import MultiFactorAuthRecipe from "../../multifactorauth/recipe";
import SessionError from "../../session/error";

export default function getAPIInterface(): APIInterface {
    return {
        createDevicePOST: async function ({ deviceName, options, session, userContext }) {
            const userId = session.getUserId();

            let mfaInstance = MultiFactorAuthRecipe.getInstance();

            if (mfaInstance === undefined) {
                throw new Error("should never come here"); // If TOTP initialised, MFA is auto initialised. This should never happen.
            }

            await MultiFactorAuth.assertAllowedToSetupFactorElseThrowInvalidClaimError(session, "totp", userContext);

            const createDeviceRes = await options.recipeImplementation.createDevice({
                userId,
                deviceName: deviceName,
                userContext: userContext,
            });

            if (createDeviceRes.status === "UNKNOWN_USER_ID_ERROR") {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Session user not found",
                });
            } else {
                return createDeviceRes;
            }
        },

        listDevicesGET: async function ({ options, session, userContext }) {
            const userId = session.getUserId();

            return await options.recipeImplementation.listDevices({
                userId,
                userContext,
            });
        },

        removeDevicePOST: async function ({ deviceName, options, session, userContext }) {
            const userId = session.getUserId();

            return await options.recipeImplementation.removeDevice({
                userId,
                deviceName,
                userContext,
            });
        },

        verifyDevicePOST: async function ({ deviceName, totp, options, session, userContext }) {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();

            const mfaInstance = MultiFactorAuthRecipe.getInstance();

            if (mfaInstance === undefined) {
                throw new Error("should never come here"); // If TOTP initialised, MFA is auto initialised. This should never happen.
            }

            await MultiFactorAuth.assertAllowedToSetupFactorElseThrowInvalidClaimError(session, "totp", userContext);

            const res = await options.recipeImplementation.verifyDevice({
                tenantId,
                userId,
                deviceName,
                totp,
                userContext,
            });

            if (res.status === "OK") {
                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                    session: session,
                    factorId: "totp",
                    userContext,
                });
            }

            return res;
        },

        verifyTOTPPOST: async function ({ totp, options, session, userContext }) {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();

            const mfaInstance = MultiFactorAuthRecipe.getInstance();
            if (mfaInstance === undefined) {
                throw new Error("should never come here"); // If TOTP initialised, MFA is auto initialised. This should never happen.
            }

            const res = await options.recipeImplementation.verifyTOTP({
                tenantId,
                userId,
                totp,
                userContext,
            });

            if (res.status === "OK") {
                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                    session: session,
                    factorId: "totp",
                    userContext,
                });
            }

            return res;
        },
    };
}
