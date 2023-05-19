"use strict";
/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
const cross_fetch_1 = __importDefault(require("cross-fetch"));
function Bitbucket(config) {
    const id = "bitbucket";
    function get(redirectURI, authCodeFromRequest) {
        let accessTokenAPIURL = "https://bitbucket.org/site/oauth2/access_token";
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
        let authorisationRedirectURL = "https://bitbucket.org/site/oauth2/authorize";
        let scopes = ["account", "email"];
        if (config.scope !== undefined) {
            scopes = config.scope;
            scopes = Array.from(new Set(scopes));
        }
        let additionalParams =
            config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined
                ? {}
                : config.authorisationRedirect.params;
        let authorizationRedirectParams = Object.assign(
            { scope: scopes.join(" "), access_type: "offline", response_type: "code", client_id: config.clientId },
            additionalParams
        );
        function getProfileInfo(accessTokenAPIResponse) {
            return __awaiter(this, void 0, void 0, function* () {
                let accessToken = accessTokenAPIResponse.access_token;
                let authHeader = `Bearer ${accessToken}`;
                let response = yield cross_fetch_1.default("https://api.bitbucket.org/2.0/user", {
                    method: "get",
                    headers: {
                        Authorization: authHeader,
                    },
                });
                if (response.status >= 400) {
                    throw response;
                }
                let userInfo = yield response.json();
                let id = userInfo.uuid;
                let emailRes = yield cross_fetch_1.default("https://api.bitbucket.org/2.0/user/emails", {
                    method: "get",
                    headers: {
                        Authorization: authHeader,
                    },
                });
                if (emailRes.status >= 400) {
                    throw response;
                }
                let emailData = yield emailRes.json();
                let email = undefined;
                let isVerified = false;
                emailData.values.forEach((emailInfo) => {
                    if (emailInfo.is_primary) {
                        email = emailInfo.email;
                        isVerified = emailInfo.is_confirmed;
                    }
                });
                if (email === undefined) {
                    return {
                        id,
                    };
                }
                return {
                    id,
                    email: {
                        id: email,
                        isVerified,
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
exports.default = Bitbucket;
