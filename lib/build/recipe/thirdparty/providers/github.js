"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
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
const cross_fetch_1 = __importDefault(require("cross-fetch"));
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
        input.config.validateAccessToken = ({ accessToken, clientConfig }) =>
            __awaiter(this, void 0, void 0, function* () {
                const basicAuthToken = Buffer.from(
                    `${clientConfig.clientId}:${
                        clientConfig.clientSecret === undefined ? "" : clientConfig.clientSecret
                    }`
                ).toString("base64");
                const applicationsResponse = yield cross_fetch_1.default(
                    `https://api.github.com/applications/${clientConfig.clientId}`,
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
                console.log("Response", yield applicationsResponse.json());
            });
    }
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const config = yield oGetConfig(input);
                if (config.scope === undefined) {
                    config.scope = ["read:user", "user:email"];
                }
                return config;
            });
        };
        originalImplementation.getUserInfo = function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                if (originalImplementation.config.validateAccessToken !== undefined) {
                    yield originalImplementation.config.validateAccessToken({
                        accessToken: input.oAuthTokens.access_token,
                        clientConfig: originalImplementation.config,
                        userContext: input.userContext,
                    });
                }
                const headers = {
                    Authorization: `Bearer ${input.oAuthTokens.access_token}`,
                    Accept: "application/vnd.github.v3+json",
                };
                const rawResponse = {};
                const emailInfoResp = yield cross_fetch_1.default("https://api.github.com/user/emails", { headers });
                if (emailInfoResp.status >= 400) {
                    throw new Error(
                        `Getting userInfo failed with ${emailInfoResp.status}: ${yield emailInfoResp.text()}`
                    );
                }
                const emailInfo = yield emailInfoResp.json();
                rawResponse.emails = emailInfo;
                const userInfoResp = yield cross_fetch_1.default("https://api.github.com/user", { headers });
                if (userInfoResp.status >= 400) {
                    throw new Error(
                        `Getting userInfo failed with ${userInfoResp.status}: ${yield userInfoResp.text()}`
                    );
                }
                const userInfo = yield userInfoResp.json();
                rawResponse.user = userInfo;
                const rawUserInfoFromProvider = {
                    fromUserInfoAPI: rawResponse,
                    fromIdTokenPayload: {},
                };
                const userInfoResult = getSupertokensUserInfoFromRawUserInfoResponseForGithub(rawUserInfoFromProvider);
                return Object.assign(Object.assign({}, userInfoResult), { rawUserInfoFromProvider });
            });
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return custom_1.default(input);
}
exports.default = Github;
