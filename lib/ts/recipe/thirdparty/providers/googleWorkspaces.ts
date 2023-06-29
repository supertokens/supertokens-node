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
import * as jose from "jose";

import { TypeProvider, TypeProviderGetResponse } from "../types";
import { verifyIdTokenFromJWKSEndpoint } from "./utils";
import { getActualClientIdFromDevelopmentClientId } from "../api/implementation";

type TypeThirdPartyProviderGoogleWorkspacesConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    domain?: string;
    authorisationRedirect?: {
        params?: { [key: string]: string | ((request: any) => string) };
    };
    isDefault?: boolean;
};

export default function GW(config: TypeThirdPartyProviderGoogleWorkspacesConfig): TypeProvider {
    const id = "google-workspaces";
    let domain: string = config.domain === undefined ? "*" : config.domain;

    function get(redirectURI: string | undefined, authCodeFromRequest: string | undefined): TypeProviderGetResponse {
        let accessTokenAPIURL = "https://oauth2.googleapis.com/token";
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
            hd: domain,
            ...additionalParams,
        };

        const jwks = jose.createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

        async function getProfileInfo(authCodeResponse: { id_token: string }) {
            let payload: any = await verifyIdTokenFromJWKSEndpoint(authCodeResponse.id_token, jwks, {
                audience: getActualClientIdFromDevelopmentClientId(config.clientId),
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
