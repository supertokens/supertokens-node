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

import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import { TypeNormalisedInput } from "./types";
import { UserContext } from "../../types";
import SuperTokens from "../../supertokens";

export default function getRecipeInterface(
    stInstance: SuperTokens,
    querier: Querier,
    config: TypeNormalisedInput
): RecipeInterface {
    return {
        getUserIdentifierInfoForUserId: async function (this: RecipeInterface, { userId, userContext }) {
            let user = await stInstance
                .getRecipeInstanceOrThrow("accountlinking")
                .recipeInterfaceImpl.getUser({ userId, userContext });

            if (user === undefined) {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }

            const primaryLoginMethod = user.loginMethods.find(
                (method) => method.recipeUserId.getAsString() === user!.id
            );

            if (primaryLoginMethod !== undefined) {
                if (primaryLoginMethod.email !== undefined) {
                    return {
                        info: primaryLoginMethod.email,
                        status: "OK",
                    };
                } else if (primaryLoginMethod.phoneNumber !== undefined) {
                    return {
                        info: primaryLoginMethod.phoneNumber,
                        status: "OK",
                    };
                }
            }

            if (user.emails.length > 0) {
                return { info: user.emails[0], status: "OK" };
            } else if (user.phoneNumbers.length > 0) {
                return { info: user.phoneNumbers[0], status: "OK" };
            }

            return {
                status: "USER_IDENTIFIER_INFO_DOES_NOT_EXIST_ERROR",
            };
        },

        createDevice: async function (
            this: RecipeInterface,
            input: {
                userId: string;
                deviceName?: string;
                skew?: number;
                period?: number;
                userIdentifierInfo?: string;
                userContext: UserContext;
            }
        ) {
            if (input.userIdentifierInfo === undefined) {
                const emailOrPhoneInfo = await this.getUserIdentifierInfoForUserId({
                    userId: input.userId,
                    userContext: input.userContext,
                });
                if (emailOrPhoneInfo.status === "OK") {
                    input.userIdentifierInfo = emailOrPhoneInfo.info;
                } else if (emailOrPhoneInfo.status === "UNKNOWN_USER_ID_ERROR") {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                } else {
                    // Ignore since UserIdentifierInfo is optional
                }
            }

            const response = await querier.sendPostRequest(
                "/recipe/totp/device",
                {
                    userId: input.userId,
                    deviceName: input.deviceName,
                    skew: input.skew ?? config.defaultSkew,
                    period: input.period ?? config.defaultPeriod,
                },
                input.userContext
            );

            if (response.status !== "OK") {
                return response;
            }

            return {
                ...response,
                qrCodeString:
                    `otpauth://totp/${encodeURI(config.issuer)}${
                        input.userIdentifierInfo !== undefined ? ":" + encodeURI(input.userIdentifierInfo) : ""
                    }` +
                    `?secret=${response.secret}&issuer=${encodeURI(config.issuer)}&digits=6&period=${
                        input.period ?? config.defaultPeriod
                    }`,
            };
        },

        updateDevice: (input: {
            userId: string;
            existingDeviceName: string;
            newDeviceName: string;
            userContext: UserContext;
        }) => {
            return querier.sendPutRequest(
                "/recipe/totp/device",
                {
                    userId: input.userId,
                    existingDeviceName: input.existingDeviceName,
                    newDeviceName: input.newDeviceName,
                },
                {},
                input.userContext
            );
        },

        listDevices: (input: { userId: string; userContext: UserContext }) => {
            return querier.sendGetRequest(
                "/recipe/totp/device/list",
                {
                    userId: input.userId,
                },
                input.userContext
            );
        },

        removeDevice: (input: { userId: string; deviceName: string; userContext: UserContext }) => {
            return querier.sendPostRequest(
                "/recipe/totp/device/remove",
                {
                    userId: input.userId,
                    deviceName: input.deviceName,
                },
                input.userContext
            );
        },

        verifyDevice: (input: {
            tenantId: string;
            userId: string;
            deviceName: string;
            totp: string;
            userContext: UserContext;
        }) => {
            return querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/totp/device/verify",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                {
                    userId: input.userId,
                    deviceName: input.deviceName,
                    totp: input.totp,
                },
                input.userContext
            );
        },

        verifyTOTP: (input: { tenantId: string; userId: string; totp: string; userContext: UserContext }) => {
            return querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/totp/verify",
                    params: {
                        tenantId: input.tenantId,
                    },
                },
                {
                    userId: input.userId,
                    totp: input.totp,
                },
                input.userContext
            );
        },
    };
}
