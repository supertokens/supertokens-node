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
import { validateTheStructureOfUserInput } from "../../../utils";
import Receipe from "../recipe";
import { sign as jwtSign, decode as jwtDecode } from "jsonwebtoken";
import STError from "../error";

type TypeThirdPartyProviderAppleConfig = {
    clientId: string;
    clientSecret: {
        keyId: string;
        privateKey: string;
        teamId: string;
    };
    scope?: string[];
    authorisationRedirect?: {
        params?: object;
    };
};

const InputSchemaTypeThirdPartyProviderAppleConfig = {
    type: "object",
    properties: {
        clientId: {
            type: "string",
        },
        clientSecret: {
            type: "object",
            properties: {
                keyId: {
                    type: "string",
                },
                privateKey: {
                    type: "string",
                },
                teamId: {
                    type: "string",
                },
            },
            required: ["keyId", "privateKey", "teamId"],
            additionalProperties: false,
        },
        scope: {
            type: "array",
            items: {
                type: "string",
            },
        },
        authorisationRedirect: {
            type: "object",
            properties: {
                params: {
                    type: "object",
                },
            },
            additionalProperties: false,
        },
        required: ["clientId", "clientSecret"],
        additionalProperties: false,
    },
};

export default function Apple(config: TypeThirdPartyProviderAppleConfig): TypeProvider {
    validateTheStructureOfUserInput(
        config,
        InputSchemaTypeThirdPartyProviderAppleConfig,
        "thirdparty recipe, provider apple",
        Receipe.RECIPE_ID
    );
    const id = "apple";

    function getClientSecret(clientId: string, keyId: string, teamId: string, privateKey: string): string {
        return jwtSign(
            {
                iss: teamId,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6 months
                aud: "https://appleid.apple.com",
                sub: clientId,
            },
            privateKey.replace(/\\n/g, "\n"),
            { algorithm: "ES256", keyid: keyId }
        );
    }

    async function get(redirectURI: string, authCodeFromRequest: string | undefined): Promise<TypeProviderGetResponse> {
        let accessTokenAPIURL = "https://appleid.apple.com/auth/token";
        let clientSecret = getClientSecret(
            config.clientId,
            config.clientSecret.keyId,
            config.clientSecret.teamId,
            config.clientSecret.privateKey
        );
        let accessTokenAPIParams: { [key: string]: string } = {
            client_id: config.clientId,
            client_secret: clientSecret,
            redirect_uri: redirectURI,
            grant_type: "authorization_code",
        };
        if (authCodeFromRequest !== undefined) {
            accessTokenAPIParams.code = authCodeFromRequest;
        }
        let authorisationRedirectURL = "https://appleid.apple.com/auth/authorize";
        let scopes = ["name", "email"];
        if (config.scope !== undefined) {
            scopes.push(...config.scope);
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
            redirect_uri: redirectURI,
            client_id: config.clientId,
            ...additionalParams,
        };

        async function getProfileInfo(accessTokenAPIResponse: {
            access_token: string;
            expires_in: number;
            token_type: string;
            refresh_token: string;
            id_token: string;
        }) {
            let payload = jwtDecode(accessTokenAPIResponse.id_token);
            if (payload === null) {
                throw new STError(
                    {
                        type: "GENERAL_ERROR",
                        payload: new Error("no user info found from user's id token received from apple"),
                    },
                    Receipe.RECIPE_ID
                );
            }
            let id = (payload as any).email as string;
            let isVerified = (payload as any).email_verified;
            return {
                id,
                email: {
                    id,
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
        };
    }

    return {
        id,
        get,
    };
}
