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
import { validateTheStructureOfUserInput } from "../../../utils";
import Recipe from "../recipe";

type TypeThirdPartyProviderGithubConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: object;
    };
};

const InputSchemaTypeThirdPartyProviderGithubConfig = {
    type: "object",
    properties: {
        clientId: {
            type: "string",
        },
        clientSecret: {
            type: "string",
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

export default function Github(config: TypeThirdPartyProviderGithubConfig): TypeProvider {
    validateTheStructureOfUserInput(
        config,
        InputSchemaTypeThirdPartyProviderGithubConfig,
        "thirdparty recipe, provider github",
        Recipe.RECIPE_ID
    );
    const id = "github";

    async function get(
        redirectURI: string | undefined,
        authCodeFromRequest: string | undefined
    ): Promise<TypeProviderGetResponse> {
        let accessTokenAPIURL = "https://github.com/login/oauth/access_token";
        let accessTokenAPIParams: { [key: string]: string } = {
            client_id: config.clientId,
            client_secret: config.clientSecret,
        };
        if (authCodeFromRequest !== undefined) {
            accessTokenAPIParams.code = authCodeFromRequest;
        }
        if (redirectURI !== undefined) {
            accessTokenAPIParams.redirect_uri = redirectURI;
        }
        let authorisationRedirectURL = "https://github.com/login/oauth/authorize";
        let scopes = ["user"];
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
            client_id: config.clientId,
            ...additionalParams,
        };

        async function getProfileInfo(accessTokenAPIResponse: {
            access_token: string;
            expires_in: number;
            token_type: string;
        }) {
            let accessToken = accessTokenAPIResponse.access_token;
            let authHeader = `Bearer ${accessToken}`;
            let response = await axios({
                method: "get",
                url: "https://api.github.com/user",
                headers: {
                    Authorization: authHeader,
                    Accept: "application/vnd.github.v3+json",
                },
            });
            let emailsInfoResponse = await axios({
                url: "https://api.github.com/user/emails",
                headers: {
                    Authorization: authHeader,
                    Accept: "application/vnd.github.v3+json",
                },
            });
            let userInfo = response.data;
            let emailsInfo = emailsInfoResponse.data;
            let id = userInfo.id;
            // if user has choosen not to show their email publicly, userInfo here will
            // have email as null. So we instead get the info from the emails api and
            // use the email which is maked as primary one.
            let emailInfo = emailsInfo.find((e: any) => e.primary);
            if (emailInfo === undefined) {
                return {
                    id,
                };
            }
            let isVerified = emailInfo !== undefined ? emailInfo.verified : false;
            return {
                id,
                email: {
                    id: emailInfo.email,
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
