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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Gitlab;
const normalisedURLDomain_1 = __importDefault(require("../../../normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
const custom_1 = __importDefault(require("./custom"));
const utils_1 = require("./utils");
// import NormalisedURLDomain from "../../../normalisedURLDomain";
function Gitlab(input) {
    if (input.config.name === undefined) {
        input.config.name = "Gitlab";
    }
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);
            if (config.scope === undefined) {
                config.scope = ["openid", "email"];
            }
            if (config.additionalConfig !== undefined && config.additionalConfig.gitlabBaseUrl !== undefined) {
                const oidcDomain = new normalisedURLDomain_1.default(config.additionalConfig.gitlabBaseUrl);
                const oidcPath = new normalisedURLPath_1.default("/.well-known/openid-configuration");
                config.oidcDiscoveryEndpoint = oidcDomain.getAsStringDangerous() + oidcPath.getAsStringDangerous();
            } else if (config.oidcDiscoveryEndpoint === undefined) {
                config.oidcDiscoveryEndpoint = "https://gitlab.com/.well-known/openid-configuration";
            }
            // The config could be coming from core where we didn't add the well-known previously
            config.oidcDiscoveryEndpoint = (0, utils_1.normaliseOIDCEndpointToIncludeWellKnown)(
                config.oidcDiscoveryEndpoint
            );
            return config;
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return (0, custom_1.default)(input);
}
// const id = "gitlab";
// function get(redirectURI: string | undefined, authCodeFromRequest: string | undefined): TypeProviderGetResponse {
//     let baseUrl =
//         config.gitlabBaseUrl === undefined
//             ? "https://gitlab.com" // no traling slash cause we add that in the path
//             : new NormalisedURLDomain(config.gitlabBaseUrl).getAsStringDangerous();
//     let accessTokenAPIURL = baseUrl + "/oauth/token";
//     let accessTokenAPIParams: { [key: string]: string } = {
//         client_id: config.clientId,
//         client_secret: config.clientSecret,
//         grant_type: "authorization_code",
//     };
//     if (authCodeFromRequest !== undefined) {
//         accessTokenAPIParams.code = authCodeFromRequest;
//     }
//     if (redirectURI !== undefined) {
//         accessTokenAPIParams.redirect_uri = redirectURI;
//     }
//     let authorisationRedirectURL = baseUrl + "/oauth/authorize";
//     let scopes = ["read_user"];
//     if (config.scope !== undefined) {
//         scopes = config.scope;
//         scopes = Array.from(new Set(scopes));
//     }
//     let additionalParams =
//         config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined
//             ? {}
//             : config.authorisationRedirect.params;
//     let authorizationRedirectParams: { [key: string]: string } = {
//         scope: scopes.join(" "),
//         response_type: "code",
//         client_id: config.clientId,
//         ...additionalParams,
//     };
//     async function getProfileInfo(accessTokenAPIResponse: {
//         access_token: string;
//         expires_in: number;
//         token_type: string;
//         refresh_token?: string;
//     }) {
//         let accessToken = accessTokenAPIResponse.access_token;
//         let authHeader = `Bearer ${accessToken}`;
//         let response = await doFetch(baseUrl + "/api/v4/user", {
//             method: "get",
//             headers: {
//                 Authorization: authHeader,
//             },
//         });
//         if (response.status >= 400) {
//             throw response;
//         }
//         let userInfo = await response.json();
//         let id = userInfo.id + "";
//         let email = userInfo.email;
//         if (email === undefined || email === null) {
//             return {
//                 id,
//             };
//         }
//         let isVerified = userInfo.confirmed_at !== null && userInfo.confirmed_at !== undefined;
//         return {
//             id,
//             email: {
//                 id: email,
//                 isVerified,
//             },
//         };
//     }
//     return {
//         accessTokenAPI: {
//             url: accessTokenAPIURL,
//             params: accessTokenAPIParams,
//         },
//         authorisationRedirect: {
//             url: authorisationRedirectURL,
//             params: authorizationRedirectParams,
//         },
//         getProfileInfo,
//         getClientId: () => {
//             return config.clientId;
//         },
//     };
// }
// return {
//     id,
//     get,
//     isDefault: config.isDefault,
// };
