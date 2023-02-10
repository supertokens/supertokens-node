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
import NewProvider from "./custom";

export default function Discord(input: ProviderInput): TypeProvider {
    if (input.config.name === undefined) {
        input.config.name = "Discord";
    }

    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://discord.com/oauth2/authorize";
    }

    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://discord.com/api/oauth2/token";
    }

    if (input.config.userInfoEndpoint === undefined) {
        input.config.userInfoEndpoint = "https://discord.com/api/users/@me";
    }

    input.config.userInfoMap = {
        ...input.config.userInfoMap,
        fromUserInfoAPI: {
            userId: "id",
            email: "email",
            emailVerified: "verified",
            ...input.config.userInfoMap?.fromUserInfoAPI,
        },
    };

    const oOverride = input.override;

    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function ({ clientType, userContext }) {
            const config = await oGetConfig({ clientType, userContext });

            if (config.scope === undefined) {
                config.scope = ["identify", "email"];
            }

            return config;
        };

        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }

        return originalImplementation;
    };

    return NewProvider(input);
}
