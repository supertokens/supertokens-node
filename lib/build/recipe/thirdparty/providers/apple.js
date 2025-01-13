"use strict";
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
exports.default = Apple;
const custom_1 = __importStar(require("./custom"));
const jose = __importStar(require("jose"));
const utils_1 = require("./utils");
async function getClientSecret(clientId, keyId, teamId, privateKey) {
    const alg = "ES256";
    const key = await jose.importPKCS8(privateKey.replace(/\\n/g, "\n"), alg);
    return new jose.SignJWT({})
        .setProtectedHeader({ alg, kid: keyId, typ: "JWT" })
        .setIssuer(teamId)
        .setIssuedAt()
        .setExpirationTime("180days")
        .setAudience("https://appleid.apple.com")
        .setSubject((0, custom_1.getActualClientIdFromDevelopmentClientId)(clientId))
        .sign(key);
}
function Apple(input) {
    if (input.config.name === undefined) {
        input.config.name = "Apple";
    }
    if (input.config.oidcDiscoveryEndpoint === undefined) {
        input.config.oidcDiscoveryEndpoint = "https://appleid.apple.com/.well-known/openid-configuration";
    }
    input.config.authorizationEndpointQueryParams = Object.assign(
        { response_mode: "form_post" },
        input.config.authorizationEndpointQueryParams
    );
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function ({ clientType, userContext }) {
            const config = await oGetConfig({ clientType, userContext });
            if (config.scope === undefined) {
                config.scope = ["openid", "email"];
            }
            if (config.clientSecret === undefined) {
                if (
                    config.additionalConfig === undefined ||
                    config.additionalConfig.keyId === undefined ||
                    config.additionalConfig.teamId === undefined ||
                    config.additionalConfig.privateKey === undefined
                ) {
                    throw new Error(
                        "Please ensure that keyId, teamId and privateKey are provided in the additionalConfig"
                    );
                }
                config.clientSecret = await getClientSecret(
                    config.clientId,
                    config.additionalConfig.keyId,
                    config.additionalConfig.teamId,
                    config.additionalConfig.privateKey
                );
            }
            // The config could be coming from core where we didn't add the well-known previously
            config.oidcDiscoveryEndpoint = (0, utils_1.normaliseOIDCEndpointToIncludeWellKnown)(
                config.oidcDiscoveryEndpoint
            );
            return config;
        };
        const oExchangeAuthCodeForOAuthTokens = originalImplementation.exchangeAuthCodeForOAuthTokens;
        originalImplementation.exchangeAuthCodeForOAuthTokens = async function (input) {
            const response = await oExchangeAuthCodeForOAuthTokens(input);
            const user = input.redirectURIInfo.redirectURIQueryParams.user;
            if (user !== undefined) {
                if (typeof user === "string") {
                    response.user = JSON.parse(user);
                } else if (typeof user === "object") {
                    response.user = user;
                }
            }
            return response;
        };
        const oGetUserInfo = originalImplementation.getUserInfo;
        originalImplementation.getUserInfo = async function (input) {
            var _a, _b;
            const response = await oGetUserInfo(input);
            const user = input.oAuthTokens.user;
            if (user !== undefined) {
                if (typeof user === "string") {
                    response.rawUserInfoFromProvider = Object.assign(
                        Object.assign({}, response.rawUserInfoFromProvider),
                        {
                            fromIdTokenPayload: Object.assign(
                                Object.assign(
                                    {},
                                    (_a = response.rawUserInfoFromProvider) === null || _a === void 0
                                        ? void 0
                                        : _a.fromIdTokenPayload
                                ),
                                { user: JSON.parse(user) }
                            ),
                        }
                    );
                } else if (typeof user === "object") {
                    response.rawUserInfoFromProvider = Object.assign(
                        Object.assign({}, response.rawUserInfoFromProvider),
                        {
                            fromIdTokenPayload: Object.assign(
                                Object.assign(
                                    {},
                                    (_b = response.rawUserInfoFromProvider) === null || _b === void 0
                                        ? void 0
                                        : _b.fromIdTokenPayload
                                ),
                                { user }
                            ),
                        }
                    );
                }
            }
            return response;
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return (0, custom_1.default)(input);
}
