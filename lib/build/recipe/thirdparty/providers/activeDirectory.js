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
// import { verifyIdTokenFromJWKSEndpoint } from "./utils";
// import { getActualClientIdFromDevelopmentClientId } from "../api/implementation";
// type TypeThirdPartyProviderActiveDirectoryWorkspacesConfig = {
//     clientId: string;
//     clientSecret: string;
//     scope?: string[];
//     tenantId: string;
//     authorisationRedirect?: {
//         params?: { [key: string]: string | ((request: any) => string) };
//     };
//     isDefault?: boolean;
// };
// export default function AD(config: TypeThirdPartyProviderActiveDirectoryWorkspacesConfig): TypeProvider {
//     const id = "active-directory";
//     function get(redirectURI: string | undefined, authCodeFromRequest: string | undefined): TypeProviderGetResponse {
//         let accessTokenAPIURL = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
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
//         let authorisationRedirectURL = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`;
//         let scopes = ["email", "openid"];
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
//             response_type: "code",
//             client_id: config.clientId,
//             ...additionalParams,
//         };
//         async function getProfileInfo(authCodeResponse: { id_token: string }) {
//             let payload: any = await verifyIdTokenFromJWKSEndpoint(
//                 authCodeResponse.id_token,
//                 `https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`,
//                 {
//                     audience: getActualClientIdFromDevelopmentClientId(config.clientId),
//                     issuer: [`https://login.microsoftonline.com/${config.tenantId}/v2.0`],
//                 }
//             );
//             if (payload.email === undefined) {
//                 throw new Error("Could not get email. Please use a different login method");
//             }
//             if (payload.tid !== config.tenantId) {
//                 throw new Error("Incorrect tenantId used for signing in.");
//             }
//             return {
//                 id: payload.sub,
//                 email: {
//                     id: "example@email.com",
//                     isVerified: true,
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
