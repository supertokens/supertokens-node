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
import { sign as jwtSign, decode as jwtDecode } from "jsonwebtoken";
import STError from "../error";
import { getActualClientIdFromDevelopmentClientId } from "../api/implementation";

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
                    type: "any",
                },
            },
            additionalProperties: false,
        },
    },
    required: ["clientId", "clientSecret"],
    additionalProperties: false,
};

export default function Apple(config: TypeThirdPartyProviderAppleConfig): TypeProvider {
    validateTheStructureOfUserInput(
        config,
        InputSchemaTypeThirdPartyProviderAppleConfig,
        "thirdparty recipe, provider apple"
    );
    const id = "apple";

    function getClientSecret(clientId: string, keyId: string, teamId: string, privateKey: string): string {
        return jwtSign(
            {
                iss: teamId,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6 months
                aud: "https://appleid.apple.com",
                sub: getActualClientIdFromDevelopmentClientId(clientId),
            },
            privateKey.replace(/\\n/g, "\n"),
            { algorithm: "ES256", keyid: keyId }
        );
    }
    try {
        // trying to generate a client secret, in case client has not passed the values correctly
        getClientSecret(
            config.clientId,
            config.clientSecret.keyId,
            config.clientSecret.teamId,
            config.clientSecret.privateKey
        );
    } catch (error) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: error.message,
        });
    }

    async function get(
        redirectURI: string | undefined,
        authCodeFromRequest: string | undefined
    ): Promise<TypeProviderGetResponse> {
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

        async function getProfileInfo(accessTokenAPIResponse: {
            access_token: string;
            expires_in: number;
            token_type: string;
            refresh_token: string;
            id_token: string;
        }) {
            let payload = jwtDecode(accessTokenAPIResponse.id_token);
            if (payload === null) {
                throw new Error("no user info found from user's id token received from apple");
            }
            let id = (payload as any).email as string;
            let isVerified = (payload as any).email_verified;
            if (id === undefined || id === null) {
                throw new Error("no user info found from user's id token received from apple");
            }
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
            getClientId: () => {
                return config.clientId;
            },
        };
    }

    return {
        id,
        get,
    };
}
