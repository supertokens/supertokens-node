"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
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
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
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
const logger_1 = require("../../../logger");
const custom_1 = __importStar(require("./custom"));
const utils_1 = require("./utils");
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
            if (custom_1.isUsingDevelopmentClientId(originalImplementation.config.clientId)) {
                clientId = custom_1.getActualClientIdFromDevelopmentClientId(originalImplementation.config.clientId);
                redirectUri = custom_1.DEV_OAUTH_REDIRECT_URL;
            }
            /* Transformation needed for dev keys END */
            const basicAuthToken = Buffer.from(
                `${clientId}:${originalImplementation.config.clientSecret}`,
                "utf8"
            ).toString("base64");
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
            const tokenResponse = await utils_1.doPostRequest(
                originalImplementation.config.tokenEndpoint,
                twitterOauthTokenParams,
                {
                    Authorization: `Basic ${basicAuthToken}`,
                }
            );
            if (tokenResponse.status >= 400) {
                logger_1.logDebugMessage(
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
    return custom_1.default(input);
}
exports.default = Twitter;
