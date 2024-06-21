"use strict";
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const utils_1 = require("../../utils");
const OAuth2Client_1 = require("./OAuth2Client");
function getRecipeInterface(querier, _config, _appInfo) {
    return {
        getOAuth2Clients: async function (input, userContext) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients`),
                Object.assign(Object.assign({}, utils_1.transformObjectKeys(input, "snake-case")), {
                    page_token: input.paginationToken,
                }),
                userContext
            );
            if (response.status === "OK") {
                // Pagination info is in the Link header, containing comma-separated links:
                // "first", "next" (if applicable).
                // Example: Link: </admin/clients?page_size=5&page_token=token1>; rel="first", </admin/clients?page_size=5&page_token=token2>; rel="next"
                // We parse the nextPaginationToken from the Link header using RegExp
                let nextPaginationToken;
                const linkHeader = response.headers.get("link");
                const nextLinkMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                if (nextLinkMatch) {
                    const url = nextLinkMatch[1];
                    const urlParams = new URLSearchParams(url.split("?")[1]);
                    nextPaginationToken = urlParams.get("page_token");
                }
                return {
                    status: "OK",
                    clients: response.data.map((client) => OAuth2Client_1.OAuth2Client.fromAPIResponse(client)),
                    nextPaginationToken,
                };
            } else {
                return {
                    status: "ERROR",
                    error: response.data.error,
                    errorHint: response.data.errorHint,
                };
            }
        },
        createOAuth2Client: async function (input, userContext) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients`),
                utils_1.transformObjectKeys(input, "snake-case"),
                userContext
            );
            if (response.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client_1.OAuth2Client.fromAPIResponse(response.data),
                };
            } else {
                return {
                    status: "ERROR",
                    error: response.data.error,
                    errorHint: response.data.errorHint,
                };
            }
        },
        updateOAuth2Client: async function (input, userContext) {
            // We convert the input into an array of "replace" operations
            const requestBody = Object.entries(input).reduce((result, [key, value]) => {
                result.push({
                    from: `/${utils_1.toSnakeCase(key)}`,
                    op: "replace",
                    path: `/${utils_1.toSnakeCase(key)}`,
                    value,
                });
                return result;
            }, []);
            let response = await querier.sendPatchRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients/${input.clientId}`),
                requestBody,
                userContext
            );
            if (response.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client_1.OAuth2Client.fromAPIResponse(response.data),
                };
            } else {
                return {
                    status: "ERROR",
                    error: response.data.error,
                    errorHint: response.data.errorHint,
                };
            }
        },
        deleteOAuth2Client: async function (input, userContext) {
            let response = await querier.sendDeleteRequest(
                new normalisedURLPath_1.default(`/recipe/oauth2/admin/clients/${input.clientId}`),
                undefined,
                undefined,
                userContext
            );
            if (response.status === "OK") {
                return { status: "OK" };
            } else {
                return {
                    status: "ERROR",
                    error: response.data.error,
                    errorHint: response.data.errorHint,
                };
            }
        },
    };
}
exports.default = getRecipeInterface;
