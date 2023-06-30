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
const jose = __importStar(require("jose"));
const utils_1 = require("./utils");
const implementation_1 = require("../api/implementation");
function GW(config) {
    const id = "google-workspaces";
    let domain = config.domain === undefined ? "*" : config.domain;
    function get(redirectURI, authCodeFromRequest) {
        let accessTokenAPIURL = "https://oauth2.googleapis.com/token";
        let accessTokenAPIParams = {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: "authorization_code",
        };
        if (authCodeFromRequest !== undefined) {
            accessTokenAPIParams.code = authCodeFromRequest;
        }
        if (redirectURI !== undefined) {
            accessTokenAPIParams.redirect_uri = redirectURI;
        }
        let authorisationRedirectURL = "https://accounts.google.com/o/oauth2/v2/auth";
        let scopes = ["https://www.googleapis.com/auth/userinfo.email"];
        if (config.scope !== undefined) {
            scopes = config.scope;
            scopes = Array.from(new Set(scopes));
        }
        let additionalParams =
            config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined
                ? {}
                : config.authorisationRedirect.params;
        let authorizationRedirectParams = Object.assign(
            {
                scope: scopes.join(" "),
                access_type: "offline",
                include_granted_scopes: "true",
                response_type: "code",
                client_id: config.clientId,
                hd: domain,
            },
            additionalParams
        );
        const jwks = jose.createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
        function getProfileInfo(authCodeResponse) {
            return __awaiter(this, void 0, void 0, function* () {
                let payload = yield utils_1.verifyIdTokenFromJWKSEndpoint(authCodeResponse.id_token, jwks, {
                    audience: implementation_1.getActualClientIdFromDevelopmentClientId(config.clientId),
                    issuer: ["https://accounts.google.com", "accounts.google.com"],
                });
                if (payload.email === undefined) {
                    throw new Error("Could not get email. Please use a different login method");
                }
                if (payload.hd === undefined) {
                    throw new Error("Please use a Google Workspace ID to login");
                }
                // if the domain is "*" in it, it means that any workspace email is allowed.
                if (!domain.includes("*") && payload.hd !== domain) {
                    throw new Error("Please use emails from " + domain + " to login");
                }
                return {
                    id: payload.sub,
                    email: {
                        id: payload.email,
                        isVerified: payload.email_verified,
                    },
                };
            });
        }
        return {
            accessTokenAPI: {
                url: accessTokenAPIURL,
                params: accessTokenAPIParams,
            },
            authorisationRedirect: {
                url: authorisationRedirectURL,
                params: authorizationRedirectParams,
            },
            getProfileInfo,
            getClientId: () => {
                return config.clientId;
            },
        };
    }
    return {
        id,
        get,
        isDefault: config.isDefault,
    };
}
exports.default = GW;
