"use strict";
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const __1 = require("../..");
function getRecipeInterface(querier, config) {
    return {
        getUserIdentifierInfoForUserId: async function ({ userId, userContext }) {
            let user = await __1.getUser(userId, userContext);
            if (user === undefined) {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
            const primaryLoginMethod = user.loginMethods.find(
                (method) => method.recipeUserId.getAsString() === user.id
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
        createDevice: async function (input) {
            var _a, _b, _c;
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
                new normalisedURLPath_1.default("/recipe/totp/device"),
                {
                    userId: input.userId,
                    deviceName: input.deviceName,
                    skew: (_a = input.skew) !== null && _a !== void 0 ? _a : config.defaultSkew,
                    period: (_b = input.period) !== null && _b !== void 0 ? _b : config.defaultPeriod,
                },
                input.userContext
            );
            return Object.assign(Object.assign({}, response), {
                qrCodeString:
                    `otpauth://totp/${encodeURI(config.issuer)}${
                        input.userIdentifierInfo !== undefined ? ":" + encodeURI(input.userIdentifierInfo) : ""
                    }` +
                    `?secret=${response.secret}&issuer=${encodeURI(config.issuer)}&digits=6&period=${
                        (_c = input.period) !== null && _c !== void 0 ? _c : config.defaultPeriod
                    }`,
            });
        },
        updateDevice: (input) => {
            return querier.sendPutRequest(
                new normalisedURLPath_1.default("/recipe/totp/device"),
                {
                    userId: input.userId,
                    existingDeviceName: input.existingDeviceName,
                    newDeviceName: input.newDeviceName,
                },
                input.userContext
            );
        },
        listDevices: (input) => {
            return querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/totp/device/list"),
                {
                    userId: input.userId,
                },
                input.userContext
            );
        },
        removeDevice: (input) => {
            return querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/totp/device/remove"),
                {
                    userId: input.userId,
                    deviceName: input.deviceName,
                },
                input.userContext
            );
        },
        verifyDevice: (input) => {
            return querier.sendPostRequest(
                new normalisedURLPath_1.default(`${input.tenantId}/recipe/totp/device/verify`),
                {
                    userId: input.userId,
                    deviceName: input.deviceName,
                    totp: input.totp,
                },
                input.userContext
            );
        },
        verifyTOTP: (input) => {
            return querier.sendPostRequest(
                new normalisedURLPath_1.default(`${input.tenantId}/recipe/totp/verify`),
                {
                    userId: input.userId,
                    totp: input.totp,
                },
                input.userContext
            );
        },
    };
}
exports.default = getRecipeInterface;
