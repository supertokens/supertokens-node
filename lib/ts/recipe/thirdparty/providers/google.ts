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
import { TypeProvider, TypeProviderGetResponse } from "../types";
import axios from "axios";

type TypeThirdPartyProviderGoogleConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: { [key: string]: string | ((request: any) => string) };
    };
    isDefault?: boolean;
};

export default function Google(config: TypeThirdPartyProviderGoogleConfig): TypeProvider {
    const id = "google";

    function get(redirectURI: string | undefined, authCodeFromRequest: string | undefined): TypeProviderGetResponse {
        let accessTokenAPIURL = "https://accounts.google.com/o/oauth2/token";
        let accessTokenAPIParams: { [key: string]: string } = {
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
        let authorizationRedirectParams: { [key: string]: string } = {
            scope: scopes.join(" "),
            access_type: "offline",
            include_granted_scopes: "true",
            response_type: "code",
            client_id: config.clientId,
            ...additionalParams,
        };

        async function getProfileInfo(accessTokenAPIResponse: {
            access_token: string;
            expires_in: number;
            token_type: string;
            scope: string;
            refresh_token: string;
        }) {
            let accessToken = accessTokenAPIResponse.access_token;
            let authHeader = `Bearer ${accessToken}`;
            let response = await axios({
                method: "get",
                url: "https://www.googleapis.com/oauth2/v1/userinfo",
                params: {
                    alt: "json",
                },
                headers: {
                    Authorization: authHeader,
                },
            });
            let userInfo = response.data;
            let id = userInfo.id;
            let email = userInfo.email;
            if (email === undefined || email === null) {
                return {
                    id,
                };
            }
            let isVerified = userInfo.verified_email;
            return {
                id,
                email: {
                    id: email,
                    isVerified,
                },
            };
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
