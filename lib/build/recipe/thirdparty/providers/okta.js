"use strict";
// /* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
//  *
//  * This software is licensed under the Apache License, Version 2.0 (the
//  * "License") as published by the Apache Software Foundation.
//  *
//  * You may not use this file except in compliance with the License. You may
//  * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//  * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
//  * License for the specific language governing permissions and limitations
//  * under the License.
//  */
// import { TypeProvider, TypeProviderGetResponse } from "../types";
// import axios from "axios";
// type TypeThirdPartyProviderOktaConfig = {
//     clientId: string;
//     clientSecret: string;
//     scope?: string[];
//     authorisationRedirect?: {
//         params?: { [key: string]: string | ((request: any) => string) };
//     };
//     oktaDomain: string;
//     authorizationServerId?: string;
//     isDefault?: boolean;
// };
// export default function Okta(config: TypeThirdPartyProviderOktaConfig): TypeProvider {
//     const id = "okta";
//     const authorizationServerId = config.authorizationServerId === undefined ? "default" : config.authorizationServerId;
//     const baseUrl = `https://${config.oktaDomain}/oauth2/${authorizationServerId}`;
//     function get(redirectURI: string | undefined, authCodeFromRequest: string | undefined): TypeProviderGetResponse {
//         let accessTokenAPIURL = baseUrl + "/v1/token";
//         let accessTokenAPIParams: { [key: string]: string } = {
//             client_id: config.clientId,
//             client_secret: config.clientSecret,
//             grant_type: "authorization_code",
//         };
//         if (authCodeFromRequest !== undefined) {
//             accessTokenAPIParams.code = authCodeFromRequest;
//         }
//         if (redirectURI !== undefined) {
//             accessTokenAPIParams.redirect_uri = redirectURI;
//         }
//         let authorisationRedirectURL = baseUrl + "/v1/authorize";
//         let scopes = ["openid", "email"];
//         if (config.scope !== undefined) {
//             scopes = config.scope;
//             scopes = Array.from(new Set(scopes));
//         }
//         let additionalParams =
//             config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined
//                 ? {}
//                 : config.authorisationRedirect.params;
//         let authorizationRedirectParams: { [key: string]: string } = {
//             scope: scopes.join(" "),
//             client_id: config.clientId,
//             response_type: "code",
//             ...additionalParams,
//         };
//         async function getProfileInfo(accessTokenAPIResponse: {
//             access_token: string;
//             expires_in: number;
//             token_type: string;
//         }) {
//             let accessToken = accessTokenAPIResponse.access_token;
//             let authHeader = `Bearer ${accessToken}`;
//             let response = await axios({
//                 method: "get",
//                 url: baseUrl + "/v1/userinfo",
//                 headers: {
//                     Authorization: authHeader,
//                 },
//             });
//             let userInfo = response.data;
//             return {
//                 id: userInfo.sub,
//                 email: {
//                     id: userInfo.email,
//                     isVerified: userInfo.email_verified,
//                 },
//             };
//         }
//         return {
//             accessTokenAPI: {
//                 url: accessTokenAPIURL,
//                 params: accessTokenAPIParams,
//             },
//             authorisationRedirect: {
//                 url: authorisationRedirectURL,
//                 params: authorizationRedirectParams,
//             },
//             getProfileInfo,
//             getClientId: () => {
//                 return config.clientId;
//             },
//         };
//     }
//     return {
//         id,
//         get,
//         isDefault: config.isDefault,
//     };
// }
