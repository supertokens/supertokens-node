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

export default function Facebook(input: ProviderInput): TypeProvider {
    if (input.config.name === undefined) {
        input.config.name = "Facebook";
    }

    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://www.facebook.com/v12.0/dialog/oauth";
    }

    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://graph.facebook.com/v12.0/oauth/access_token";
    }

    if (input.config.userInfoEndpoint === undefined) {
        input.config.userInfoEndpoint = "https://graph.facebook.com/me";
    }

    input.config.userInfoMap = {
        ...input.config.userInfoMap,
        fromUserInfoAPI: {
            userId: "id",
            ...input.config.userInfoMap?.fromUserInfoAPI,
        },
    };

    const oOverride = input.override;

    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);

            if (config.scope === undefined) {
                config.scope = ["email"];
            }

            return config;
        };

        const oGetUserInfo = originalImplementation.getUserInfo;
        originalImplementation.getUserInfo = async function (input) {
            const fieldsPermissionMap: Record<string, string[]> = {
                public_profile: [
                    "first_name",
                    "last_name",
                    "middle_name",
                    "name",
                    "name_format",
                    "picture",
                    "short_name",
                ],
                email: ["id", "email"],
                user_birthday: ["birthday"],
                user_videos: ["videos"],
                user_posts: ["posts"],
                user_photos: ["photos"],
                user_location: ["location"],
                user_link: ["link"],
                user_likes: ["likes"],
                user_hometown: ["hometown"],
                user_gender: ["gender"],
                user_friends: ["friends"],
                user_age_range: ["age_range"],
            };
            const scopeValues = originalImplementation.config.scope;

            const fields =
                scopeValues
                    ?.map((scopeValue) => fieldsPermissionMap[scopeValue] ?? [])
                    .flat()
                    .join(",") ?? "id,email";

            originalImplementation.config.userInfoEndpointQueryParams = {
                access_token: input.oAuthTokens.access_token,
                fields,
                format: "json",
                ...originalImplementation.config.userInfoEndpointQueryParams,
            };

            originalImplementation.config.userInfoEndpointHeaders = {
                ...originalImplementation.config.userInfoEndpointHeaders,
                Authorization: null,
            };

            return await oGetUserInfo(input);
        };

        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }

        return originalImplementation;
    };

    return NewProvider(input);
}
