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
import { doGetRequest } from "./utils";

export default function Linkedin(input: ProviderInput): TypeProvider {
    if (input.config.name === undefined) {
        input.config.name = "LinkedIn";
    }

    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://www.linkedin.com/oauth/v2/authorization";
    }

    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://www.linkedin.com/oauth/v2/accessToken";
    }

    const oOverride = input.override;

    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);

            if (config.scope === undefined) {
                config.scope = ["r_emailaddress", "r_liteprofile"];
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

            const userInfoFromAccessToken = await doGetRequest("https://api.linkedin.com/v2/me", undefined, headers);
            rawUserInfoFromProvider.fromUserInfoAPI = userInfoFromAccessToken.response;

            const emailAPIURL = "https://api.linkedin.com/v2/emailAddress";
            const userInfoFromEmail = await doGetRequest(
                emailAPIURL,
                { q: "members", projection: "(elements*(handle~))" },
                headers
            );

            if (userInfoFromEmail.response.elements && userInfoFromEmail.response.elements.length > 0) {
                rawUserInfoFromProvider.fromUserInfoAPI.email =
                    userInfoFromEmail.response.elements[0]["handle~"].emailAddress;
            }
            rawUserInfoFromProvider.fromUserInfoAPI = {
                ...rawUserInfoFromProvider.fromUserInfoAPI,
                ...userInfoFromEmail.response,
            };

            return {
                thirdPartyUserId: rawUserInfoFromProvider.fromUserInfoAPI.id,
                email: {
                    id: rawUserInfoFromProvider.fromUserInfoAPI.email,
                    isVerified: false,
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
