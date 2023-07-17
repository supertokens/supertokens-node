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

import { ProviderInput, TypeProvider } from "../types";
import { doGetRequest } from "./utils";

import NewProvider from "./custom";

export default function Bitbucket(input: ProviderInput): TypeProvider {
    if (input.config.name === undefined) {
        input.config.name = "Bitbucket";
    }

    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://bitbucket.org/site/oauth2/authorize";
    }

    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://bitbucket.org/site/oauth2/access_token";
    }

    if (input.config.authorizationEndpointQueryParams === undefined) {
        input.config.authorizationEndpointQueryParams = {
            audience: "api.atlassian.com",
        };
    }

    const oOverride = input.override;

    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);

            if (config.scope === undefined) {
                config.scope = ["account", "email"];
            }

            return config;
        };

        originalImplementation.getUserInfo = async function (input) {
            const accessToken = input.oAuthTokens.access_token;

            if (accessToken === undefined) {
                throw new Error("Access token not found");
            }

            const headers: { [key: string]: string } = {
                Authorization: `Bearer ${accessToken}`,
            };
            let rawUserInfoFromProvider: {
                fromUserInfoAPI: any;
                fromIdTokenPayload: any;
            } = {
                fromUserInfoAPI: {},
                fromIdTokenPayload: {},
            };

            const userInfoFromAccessToken = await doGetRequest(
                "https://api.bitbucket.org/2.0/user",
                undefined,
                headers
            );
            rawUserInfoFromProvider.fromUserInfoAPI = userInfoFromAccessToken;

            const userInfoFromEmail = await doGetRequest(
                "https://api.bitbucket.org/2.0/user/emails",
                undefined,
                headers
            );

            rawUserInfoFromProvider.fromUserInfoAPI.email = userInfoFromEmail;

            let email = undefined;
            let isVerified = false;
            for (const emailInfo of userInfoFromEmail.values) {
                if (emailInfo.is_primary) {
                    email = emailInfo.email;
                    isVerified = emailInfo.is_confirmed;
                }
            }

            return {
                thirdPartyUserId: rawUserInfoFromProvider.fromUserInfoAPI.uuid,
                email:
                    email === undefined
                        ? undefined
                        : {
                              id: email,
                              isVerified,
                          },
                rawUserInfoFromProvider,
            };
        };

        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }

        return originalImplementation;
    };

    return NewProvider(input);
}
