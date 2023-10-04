"use strict";
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
function getRecipeInterface(querier, config) {
    function copyAndRemoveUserContext(input) {
        let result = Object.assign({}, input);
        delete result.userContext;
        return result;
    }
    return {
        createDevice: async function (input) {
            const { userId, deviceName, skew, period, userIdentifierInfo } = input;
            let response = await querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/totp/device"), {
                userId,
                deviceName,
                skew: skew !== null && skew !== void 0 ? skew : config.defaultSkew,
                period: period !== null && period !== void 0 ? period : config.defaultPeriod,
            });
            if (response.status !== "OK") {
                return response;
            }
            let issuerName = config.issuer;
            let userIdentifier = userIdentifierInfo;
            return {
                status: "OK",
                issuerName,
                userIdentifier,
                secret: response.secret,
                qrCodeString: encodeURI(
                    `otpauth://totp/${issuerName}${userIdentifier !== undefined ? ":" + userIdentifier : ""}` +
                        `?secret=${response.secret}&issuer=${issuerName}`
                ),
            };
        },
        verifyDevice: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/totp/device/verify"),
                copyAndRemoveUserContext(input)
            );
            return response;
        },
        verifyCode: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/${input.tenantId}/recipe/totp/verify`),
                copyAndRemoveUserContext(input)
            );
            return response;
        },
        updateDevice: async function (input) {
            let response = await querier.sendPutRequest(
                new normalisedURLPath_1.default("/recipe/totp/device"),
                copyAndRemoveUserContext(input)
            );
            return response;
        },
        removeDevice: async function (input) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/totp/device/remove"),
                copyAndRemoveUserContext(input)
            );
            return response;
        },
        listDevices: async function (input) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default("/recipe/totp/device/list"),
                copyAndRemoveUserContext(input)
            );
            return response;
        },
    };
}
exports.default = getRecipeInterface;
