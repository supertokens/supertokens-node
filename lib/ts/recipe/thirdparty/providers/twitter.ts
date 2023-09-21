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
import { doPostRequest } from "./utils";

export default function Twitter(input: ProviderInput): TypeProvider {
    if (input.config.name === undefined) {
        input.config.name = "Twitter";
    }

    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://twitter.com/i/oauth2/authorize";
    }

    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://api.twitter.com/2/oauth2/token";
    }

    if (input.config.userInfoEndpoint === undefined) {
        input.config.userInfoEndpoint = "https://api.twitter.com/2/users/me";
    }

    if (input.config.requireEmail === undefined) {
        input.config.requireEmail = false;
    }

    input.config.userInfoMap = {
        fromUserInfoAPI: {
            userId: "data.id",
            ...input.config.userInfoMap?.fromUserInfoAPI,
        },
        ...input.config.userInfoMap,
    };

    const oOverride = input.override;

    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);

            if (config.scope === undefined) {
                config.scope = ["users.read", "tweet.read"];
            }

            if (config.forcePKCE === undefined) {
                config.forcePKCE = true;
            }

            return config;
        };

        originalImplementation.exchangeAuthCodeForOAuthTokens = async function (input) {
            const basicAuthToken = Buffer.from(
                `${originalImplementation.config.clientId}:${originalImplementation.config.clientSecret}`,
                "utf8"
            ).toString("base64");
            const twitterOauthTokenParams = {
                grant_type: "authorization_code",
                client_id: originalImplementation.config.clientId,
                code_verifier: input.redirectURIInfo.pkceCodeVerifier,
                redirect_uri: input.redirectURIInfo.redirectURIOnProviderDashboard,
                code: input.redirectURIInfo.redirectURIQueryParams.code,
                ...originalImplementation.config.tokenEndpointBodyParams,
            };

            return await doPostRequest(originalImplementation.config.tokenEndpoint!, twitterOauthTokenParams, {
                Authorization: `Basic ${basicAuthToken}`,
            });
        };

        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }

        return originalImplementation;
    };

    return NewProvider(input);
}
