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
const custom_1 = __importStar(require("./custom"));
const jsonwebtoken_1 = require("jsonwebtoken");
function getClientSecret(clientId, keyId, teamId, privateKey) {
    return jsonwebtoken_1.sign(
        {
            iss: teamId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 86400 * 180,
            aud: "https://appleid.apple.com",
            sub: custom_1.getActualClientIdFromDevelopmentClientId(clientId),
        },
        privateKey.replace(/\\n/g, "\n"),
        { algorithm: "ES256", keyid: keyId }
    );
}
function Apple(input) {
    if (input.config.name === undefined) {
        input.config.name = "Apple";
    }
    if (input.config.oidcDiscoveryEndpoint === undefined) {
        input.config.oidcDiscoveryEndpoint = "https://appleid.apple.com/";
    }
    input.config.authorizationEndpointQueryParams = Object.assign(
        { response_mode: "form_post" },
        input.config.authorizationEndpointQueryParams
    );
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = function ({ clientType, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const config = yield oGetConfig({ clientType, userContext });
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
                    config.clientSecret = getClientSecret(
                        config.clientID,
                        config.additionalConfig.keyId,
                        config.additionalConfig.teamId,
                        config.additionalConfig.privateKey
                    );
                }
                return config;
            });
        };
        const oExchangeAuthCodeForOAuthTokens = originalImplementation.exchangeAuthCodeForOAuthTokens;
        originalImplementation.exchangeAuthCodeForOAuthTokens = function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield oExchangeAuthCodeForOAuthTokens(input);
                const user = input.redirectURIInfo.redirectURIQueryParams.user;
                if (user !== undefined) {
                    if (typeof user === "string") {
                        response.user = JSON.parse(user);
                    } else if (typeof user === "object") {
                        response.user = user;
                    }
                }
                return response;
            });
        };
        const oGetUserInfo = originalImplementation.getUserInfo;
        originalImplementation.getUserInfo = function (input) {
            var _a, _b;
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield oGetUserInfo(input);
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
            });
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return custom_1.default(input);
}
exports.default = Apple;
