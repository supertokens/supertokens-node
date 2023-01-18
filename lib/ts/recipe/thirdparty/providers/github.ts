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
import axios from "axios";
import { ProviderInput, TypeProvider, UserInfo } from "../types";
import NewProvider from "./custom";

function getSupertokensUserInfoFromRawUserInfoResponseForGithub(rawUserInfoResponse: {
    fromIdTokenPayload?: any;
    fromUserInfoAPI?: any;
}): UserInfo {
    if (rawUserInfoResponse.fromUserInfoAPI === undefined) {
        throw new Error("rawUserInfoResponse.fromUserInfoAPI is not available");
    }

    const result: UserInfo = {
        thirdPartyUserId: rawUserInfoResponse.fromUserInfoAPI.user.id,
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

            const emailInfo = (await axios.get("https://api.github.com/user/emails", { headers })).data;
            rawResponse.emails = emailInfo;

            const userInfo = (await axios.get("https://api.github.com/user", { headers })).data;
            rawResponse.user = userInfo;

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
