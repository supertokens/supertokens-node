"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRecipeInterface;
const constants_1 = require("../multitenancy/constants");
function getRecipeInterface(querier, config) {
    void querier;
    void config;
    return {
        createOrUpdateClient: async function ({
            tenantId,
            clientId,
            spEntityId,
            redirectURIs,
            defaultRedirectURI,
            metadataXML,
            metadataURL,
            allowIDPInitiatedLogin,
            userContext,
        }) {
            return await querier.sendPutRequest(
                {
                    path: "/<tenantId>/recipe/saml/clients",
                    params: {
                        tenantId,
                    },
                },
                {
                    clientId,
                    spEntityId,
                    redirectURIs,
                    defaultRedirectURI,
                    metadataXML,
                    metadataURL,
                    allowIDPInitiatedLogin,
                },
                {},
                userContext
            );
        },
        verifyClientRedirectURI: async function (input) {
            return {
                status: "OK",
                info: `PLACEHOLDER_VALIDATION: ${input.clientId} -> ${input.redirectURI}`,
            };
        },
        verifySAMLResponse: async function ({ tenantId, samlResponse, relayState, userContext }) {
            const resp = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/saml/callback",
                    params: {
                        tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    samlResponse,
                    relayState,
                },
                userContext
            );
            return resp;
        },
        createLoginRequest: async function ({ tenantId, clientId, redirectURI, state, acsURL, userContext }) {
            const resp = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/saml/login",
                    params: {
                        tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    clientId,
                    redirectURI,
                    state,
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
        exchangeCodeForToken: async function ({ tenantId, code, userContext }) {
            const resp = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/saml/token",
                    params: {
                        tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    code,
                },
                userContext
            );
            return resp;
        },
    };
}
