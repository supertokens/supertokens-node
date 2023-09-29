"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
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
const utils_1 = require("../../../utils");
const custom_1 = __importDefault(require("./custom"));
function getSupertokensUserInfoFromRawUserInfoResponseForGithub(rawUserInfoResponse) {
    if (rawUserInfoResponse.fromUserInfoAPI === undefined) {
        throw new Error("rawUserInfoResponse.fromUserInfoAPI is not available");
    }
    const result = {
        thirdPartyUserId: `${rawUserInfoResponse.fromUserInfoAPI.user.id}`,
        rawUserInfoFromProvider: {
            fromIdTokenPayload: {},
            fromUserInfoAPI: {},
        },
    };
    const emailsInfo = rawUserInfoResponse.fromUserInfoAPI.emails;
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
function Github(input) {
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
            const applicationsResponse = await fetch(
                `https://api.github.com/applications/${clientConfig.clientId}/token`,
                {
                    headers: {
                        Authorization: `Basic ${basicAuthToken}`,
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({
                        access_token: accessToken,
                    }),
                }
            );
            if (applicationsResponse.status !== 200) {
                throw new Error("Invalid access token");
            }
            const body = await applicationsResponse.json();
            if (body.app === undefined || body.app.client_id !== clientConfig.clientId) {
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
            const rawResponse = {};
            const emailInfoResp = await utils_1.doFetch("https://api.github.com/user/emails", { headers });
            if (emailInfoResp.status >= 400) {
                throw new Error(`Getting userInfo failed with ${emailInfoResp.status}: ${await emailInfoResp.text()}`);
            }
            const emailInfo = await emailInfoResp.json();
            rawResponse.emails = emailInfo;
            const userInfoResp = await utils_1.doFetch("https://api.github.com/user", { headers });
            if (userInfoResp.status >= 400) {
                throw new Error(`Getting userInfo failed with ${userInfoResp.status}: ${await userInfoResp.text()}`);
            }
            const userInfo = await userInfoResp.json();
            rawResponse.user = userInfo;
            const rawUserInfoFromProvider = {
                fromUserInfoAPI: rawResponse,
                fromIdTokenPayload: {},
            };
            const userInfoResult = getSupertokensUserInfoFromRawUserInfoResponseForGithub(rawUserInfoFromProvider);
            return Object.assign(Object.assign({}, userInfoResult), { rawUserInfoFromProvider });
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return custom_1.default(input);
}
exports.default = Github;
