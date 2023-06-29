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
import { getActualClientIdFromDevelopmentClientId } from "../api/implementation";
import SuperTokens from "../../../supertokens";
import { APPLE_REDIRECT_HANDLER } from "../constants";
import { verifyIdTokenFromJWKSEndpoint } from "./utils";
import crypto from "crypto";

type TypeThirdPartyProviderAppleConfig = {
    clientId: string;
    clientSecret: {
        keyId: string;
        privateKey: string;
        teamId: string;
    };
    scope?: string[];
    authorisationRedirect?: {
        params?: { [key: string]: string | ((request: any) => string) };
    };
    isDefault?: boolean;
};

export default function Apple(config: TypeThirdPartyProviderAppleConfig): TypeProvider {
    const id = "apple";

    async function getClientSecret(
        clientId: string,
        keyId: string,
        teamId: string,
        privateKey: string
    ): Promise<string> {
        const alg = "ES256";

        return new jose.SignJWT({})
            .setProtectedHeader({ alg, kid: keyId, typ: "JWT" })
            .setIssuer(teamId)
            .setIssuedAt()
            .setExpirationTime("180days")
            .setAudience("https://appleid.apple.com")
            .setSubject(getActualClientIdFromDevelopmentClientId(clientId))
            .sign(crypto.createPrivateKey(privateKey.replace(/\\n/g, "\n")));
    }

    // trying to generate a client secret, in case client has not passed the values correctly
    const clientSecretPromise = getClientSecret(
        config.clientId,
        config.clientSecret.keyId,
        config.clientSecret.teamId,
        config.clientSecret.privateKey
    );

    async function get(
        redirectURI: string | undefined,
        authCodeFromRequest: string | undefined
    ): Promise<TypeProviderGetResponse> {
        let accessTokenAPIURL = "https://appleid.apple.com/auth/token";

        let accessTokenAPIParams: { [key: string]: string } = {
            client_id: config.clientId,
            client_secret: await clientSecretPromise,
            grant_type: "authorization_code",
        };
        if (authCodeFromRequest !== undefined) {
            accessTokenAPIParams.code = authCodeFromRequest;
        }
        if (redirectURI !== undefined) {
            accessTokenAPIParams.redirect_uri = redirectURI;
        }
        let authorisationRedirectURL = "https://appleid.apple.com/auth/authorize";
        let scopes: string[] = ["email"];
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
            response_mode: "form_post",
            response_type: "code",
            client_id: config.clientId,
            ...additionalParams,
        };

        const jwks = jose.createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

        async function getProfileInfo(accessTokenAPIResponse: {
            access_token: string;
            expires_in: number;
            token_type: string;
            refresh_token: string;
            id_token: string;
        }) {
            /*
            - Verify the JWS E256 signature using the server’s public key
            - Verify the nonce for the authentication
            - Verify that the iss field contains https://appleid.apple.com
            - Verify that the aud field is the developer’s client_id
            - Verify that the time is earlier than the exp value of the token */
            const payload = await verifyIdTokenFromJWKSEndpoint(accessTokenAPIResponse.id_token, jwks, {
                issuer: "https://appleid.apple.com",
                audience: getActualClientIdFromDevelopmentClientId(config.clientId),
            });
            if (payload === null) {
                throw new Error("no user info found from user's id token received from apple");
            }
            let id = (payload as any).sub as string;
            let email = (payload as any).email as string;
            let isVerified = (payload as any).email_verified;
            if (id === undefined || id === null) {
                throw new Error("no user info found from user's id token received from apple");
            }
            return {
                id,
                email: {
                    id: email,
                    isVerified,
                },
            };
        }
        function getRedirectURI() {
            let supertokens = SuperTokens.getInstanceOrThrowError();
            return (
                supertokens.appInfo.apiDomain.getAsStringDangerous() +
                supertokens.appInfo.apiBasePath.getAsStringDangerous() +
                APPLE_REDIRECT_HANDLER
            );
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
            getRedirectURI,
        };
    }

    return {
        id,
        get,
        isDefault: config.isDefault,
    };
}
