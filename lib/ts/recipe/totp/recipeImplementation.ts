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

import { RecipeInterface, TypeNormalisedInput } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

export default function getRecipeInterface(querier: Querier, config: TypeNormalisedInput): RecipeInterface {
    function copyAndRemoveUserContext(input: any): any {
        let result = {
            ...input,
        };
        delete result.userContext;
        return result;
    }

    return {
        createDevice: async function (input) {
            const { userContext, userIdentifierInfo, ...rest } = input;
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/totp/device"), {
                ...rest,
                skew: input.skew ?? config.defaultSkew,
                period: input.period ?? config.defaultPeriod,
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
                    `otpauth://totp/${issuerName}${userIdentifier ? ":" + userIdentifier : ""}` +
                        `?secret=${response.secret}&issuer=${issuerName}`
                ),
            };
        },

        verifyDevice: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/totp/device/verify"),
                copyAndRemoveUserContext(input)
            );

            return response;
        },

        verifyCode: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/totp/verify"),
                copyAndRemoveUserContext(input)
            );

            return response;
        },

        updateDevice: async function (input) {
            let response = await querier.sendPutRequest(
                new NormalisedURLPath("/recipe/totp/device"),
                copyAndRemoveUserContext(input)
            );

            return response;
        },

        removeDevice: async function (input) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath("/recipe/totp/device/remove"),
                copyAndRemoveUserContext(input)
            );

            return response;
        },

        listDevices: async function (input) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath("/recipe/totp/device/list"),
                copyAndRemoveUserContext(input)
            );

            return response;
        },
    };
}