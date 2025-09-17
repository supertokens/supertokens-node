/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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

import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import { TypeNormalisedInput } from "./types";
import { UserContext } from "../../types";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";

export default function getRecipeInterface(querier: Querier, config: TypeNormalisedInput): RecipeInterface {
    void querier;
    void config;
    return {
        verifyClientRedirectURI: async function (
            this: RecipeInterface,
            input: { clientId: string; redirectURI: string; userContext: UserContext }
        ) {
            return {
                status: "OK",
                info: `PLACEHOLDER_VALIDATION: ${input.clientId} -> ${input.redirectURI}`,
            };
        },

        verifySAMLResponse: async function (
            this: RecipeInterface,
            input: { samlResponse: string; userContext: UserContext }
        ) {
            void input;
            return {
                status: "OK",
            };
        },

        createLoginRequest: async function (
            this: RecipeInterface,
            { tenantId, clientId, redirectURI, acsURL, userContext }
        ) {
            const resp = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/saml/login",
                    params: {
                        tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    clientId,
                    redirectURI,
                    acsURL,
                },
                userContext
            );

            if (resp.status !== "OK") {
                return {
                    status: resp.status,
                };
            }

            return {
                status: "OK",
                redirectURI: resp.ssoRedirectURI,
            };
        },
    };
}
