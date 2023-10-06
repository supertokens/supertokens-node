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
import { ProviderInput, TypeProvider, UserInfo } from "../types";
import NewProvider from "./custom";
import { doGetRequest, doPostRequest } from "./utils";

function getSupertokensUserInfoFromRawUserInfoResponseForGithub(rawUserInfoResponse: {
    fromIdTokenPayload?: any;
    fromUserInfoAPI?: any;
}): UserInfo {
    if (rawUserInfoResponse.fromUserInfoAPI === undefined) {
        throw new Error("rawUserInfoResponse.fromUserInfoAPI is not available");
    }

    const result: UserInfo = {
        thirdPartyUserId: `${rawUserInfoResponse.fromUserInfoAPI.user.id}`, // coz user.id is a number
        rawUserInfoFromProvider: {
            fromIdTokenPayload: {},
            fromUserInfoAPI: {},
        },
    };

    const emailsInfo: any[] = rawUserInfoResponse.fromUserInfoAPI.emails;
    for (const info of emailsInfo) {
        if (info.primary) {
            result.email = {
                id: info.email,
                isVerified: info.verified,
            };
        }
    }

    return result;
}

export default function Github(input: ProviderInput): TypeProvider {
    if (input.config.name === undefined) {
        input.config.name = "Github";
    }

    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://github.com/login/oauth/authorize";
    }

    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://github.com/login/oauth/access_token";
    }

    if (input.config.validateAccessToken === undefined) {
        input.config.validateAccessToken = async ({ accessToken, clientConfig }) => {
            const basicAuthToken = Buffer.from(
                `${clientConfig.clientId}:${clientConfig.clientSecret === undefined ? "" : clientConfig.clientSecret}`
            ).toString("base64");

            const applicationResponse = await doPostRequest(
                `https://api.github.com/applications/${clientConfig.clientId}/token`,
                {
                    access_token: accessToken,
                },
                {
                    Authorization: `Basic ${basicAuthToken}`,
                    "Content-Type": "application/json",
                }
            );

            if (applicationResponse.status !== 200) {
                throw new Error("Invalid access token");
            }

            if (
                applicationResponse.response.app === undefined ||
                applicationResponse.response.app.client_id !== clientConfig.clientId
            ) {
                throw new Error("Access token does not belong to your application");
            }
        };
    }

    const oOverride = input.override;

    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);

            if (config.scope === undefined) {
                config.scope = ["read:user", "user:email"];
            }

            return config;
        };

        originalImplementation.getUserInfo = async function (input) {
            const headers = {
                Authorization: `Bearer ${input.oAuthTokens.access_token}`,
                Accept: "application/vnd.github.v3+json",
            };
            const rawResponse: { [key: string]: any } = {};

            const emailInfoResp = await doGetRequest("https://api.github.com/user/emails", undefined, headers);

            if (emailInfoResp.status >= 400) {
                throw new Error(
                    `Getting userInfo failed with ${emailInfoResp.status}: ${await emailInfoResp.response.text()}`
                );
            }

            rawResponse.emails = emailInfoResp.response;

            const userInfoResp = await doGetRequest("https://api.github.com/user", undefined, headers);

            if (userInfoResp.status >= 400) {
                throw new Error(
                    `Getting userInfo failed with ${userInfoResp.status}: ${await userInfoResp.response.text()}`
                );
            }

            rawResponse.user = userInfoResp.response;

            const rawUserInfoFromProvider = {
                fromUserInfoAPI: rawResponse,
                fromIdTokenPayload: {},
            };
            const userInfoResult = getSupertokensUserInfoFromRawUserInfoResponseForGithub(rawUserInfoFromProvider);

            return {
                ...userInfoResult,
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
