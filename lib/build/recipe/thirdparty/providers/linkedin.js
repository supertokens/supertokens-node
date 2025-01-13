"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Linkedin;
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
const logger_1 = require("../../../logger");
const custom_1 = __importDefault(require("./custom"));
const thirdpartyUtils_1 = require("../../../thirdpartyUtils");
function Linkedin(input) {
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
                // https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2?context=linkedin%2Fconsumer%2Fcontext#authenticating-members
                config.scope = ["openid", "profile", "email"];
            }
            return config;
        };
        originalImplementation.getUserInfo = async function (input) {
            const accessToken = input.oAuthTokens.access_token;
            if (accessToken === undefined) {
                throw new Error("Access token not found");
            }
            const headers = {
                Authorization: `Bearer ${accessToken}`,
            };
            let rawUserInfoFromProvider = {
                fromUserInfoAPI: {},
                fromIdTokenPayload: {},
            };
            // https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2?context=linkedin%2Fconsumer%2Fcontext#sample-api-response
            const userInfoFromAccessToken = await (0, thirdpartyUtils_1.doGetRequest)(
                "https://api.linkedin.com/v2/userinfo",
                undefined,
                headers
            );
            rawUserInfoFromProvider.fromUserInfoAPI = userInfoFromAccessToken.jsonResponse;
            if (userInfoFromAccessToken.status >= 400) {
                (0, logger_1.logDebugMessage)(
                    `Received response with status ${userInfoFromAccessToken.status} and body ${userInfoFromAccessToken.stringResponse}`
                );
                throw new Error(
                    `Received response with status ${userInfoFromAccessToken.status} and body ${userInfoFromAccessToken.stringResponse}`
                );
            }
            return {
                thirdPartyUserId: rawUserInfoFromProvider.fromUserInfoAPI.sub,
                email: {
                    id: rawUserInfoFromProvider.fromUserInfoAPI.email,
                    isVerified: rawUserInfoFromProvider.fromUserInfoAPI.email_verified,
                },
                rawUserInfoFromProvider,
            };
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return (0, custom_1.default)(input);
}
