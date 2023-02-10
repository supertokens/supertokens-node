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
import { ProviderInput, TypeProvider } from "../types";
import Google from "./google";

export default function GoogleWorkspaces(input: ProviderInput): TypeProvider {
    if (input.config.name === undefined) {
        input.config.name = "Google Workspaces";
    }

    if (input.config.validateIdTokenPayload === undefined) {
        input.config.validateIdTokenPayload = async function (input) {
            if (
                input.clientConfig.additionalConfig?.hd !== undefined &&
                input.clientConfig.additionalConfig?.hd !== "*"
            ) {
                if (input.clientConfig.additionalConfig?.hd !== input.idTokenPayload.hd) {
                    throw new Error(
                        "the value for hd claim in the id token does not match the value provided in the config"
                    );
                }
            }
        };
    }

    input.config.userInfoMap = {
        ...input.config.userInfoMap,
        fromUserInfoAPI: {
            userId: "id",
            email: "email",
            emailVerified: "email_verified",
            ...input.config.userInfoMap?.fromUserInfoAPI,
        },
    };

    input.config.authorizationEndpointQueryParams = {
        included_grant_scopes: "true",
        access_type: "offline",
        ...input.config.authorizationEndpointQueryParams,
    };

    const oOverride = input.override;

    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);

            config.additionalConfig = {
                hd: "*",
                ...config.additionalConfig,
            };

            return config;
        };

        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }

        return originalImplementation;
    };

    return Google(input);
}
