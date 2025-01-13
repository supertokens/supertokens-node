"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              var desc = Object.getOwnPropertyDescriptor(m, k);
              if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
                  desc = {
                      enumerable: true,
                      get: function () {
                          return m[k];
                      },
                  };
              }
              Object.defineProperty(o, k2, desc);
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    (function () {
        var ownKeys = function (o) {
            ownKeys =
                Object.getOwnPropertyNames ||
                function (o) {
                    var ar = [];
                    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
                    return ar;
                };
            return ownKeys(o);
        };
        return function (mod) {
            if (mod && mod.__esModule) return mod;
            var result = {};
            if (mod != null)
                for (var k = ownKeys(mod), i = 0; i < k.length; i++)
                    if (k[i] !== "default") __createBinding(result, mod, k[i]);
            __setModuleDefault(result, mod);
            return result;
        };
    })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Twitter;
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
const utils_1 = require("../../../utils");
const custom_1 = __importStar(require("./custom"));
const thirdpartyUtils_1 = require("../../../thirdpartyUtils");
function Twitter(input) {
    var _a;
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
    input.config.userInfoMap = Object.assign(
        {
            fromUserInfoAPI: Object.assign(
                { userId: "data.id" },
                (_a = input.config.userInfoMap) === null || _a === void 0 ? void 0 : _a.fromUserInfoAPI
            ),
        },
        input.config.userInfoMap
    );
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
            let clientId = originalImplementation.config.clientId;
            let redirectUri = input.redirectURIInfo.redirectURIOnProviderDashboard;
            // We need to do this because we don't call the original implementation
            /* Transformation needed for dev keys BEGIN */
            if ((0, custom_1.isUsingDevelopmentClientId)(originalImplementation.config.clientId)) {
                clientId = (0, custom_1.getActualClientIdFromDevelopmentClientId)(
                    originalImplementation.config.clientId
                );
                redirectUri = custom_1.DEV_OAUTH_REDIRECT_URL;
            }
            /* Transformation needed for dev keys END */
            const basicAuthToken = (0, utils_1.encodeBase64)(
                `${clientId}:${originalImplementation.config.clientSecret}`
            );
            const twitterOauthTokenParams = Object.assign(
                {
                    grant_type: "authorization_code",
                    client_id: clientId,
                    code_verifier: input.redirectURIInfo.pkceCodeVerifier,
                    redirect_uri: redirectUri,
                    code: input.redirectURIInfo.redirectURIQueryParams.code,
                },
                originalImplementation.config.tokenEndpointBodyParams
            );
            const tokenResponse = await (0, thirdpartyUtils_1.doPostRequest)(
                originalImplementation.config.tokenEndpoint,
                twitterOauthTokenParams,
                {
                    Authorization: `Basic ${basicAuthToken}`,
                }
            );
            if (tokenResponse.status >= 400) {
                (0, logger_1.logDebugMessage)(
                    `Received response with status ${tokenResponse.status} and body ${tokenResponse.stringResponse}`
                );
                throw new Error(
                    `Received response with status ${tokenResponse.status} and body ${tokenResponse.stringResponse}`
                );
            }
            return tokenResponse.jsonResponse;
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return (0, custom_1.default)(input);
}
