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

import NormalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";
import { NormalisedAppinfo } from "../../types";
import { toSnakeCase, transformObjectKeys } from "../../utils";
import { OAuth2Client } from "./OAuth2Client";
import { RecipeInterface, TypeNormalisedInput } from "./types";

export default function getRecipeInterface(
    querier: Querier,
    _config: TypeNormalisedInput,
    _appInfo: NormalisedAppinfo
): RecipeInterface {
    return {
        getOAuth2Clients: async function (input, userContext) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(`/recipe/oauth2/admin/clients`),
                {
                    ...transformObjectKeys(input, "snake-case"),
                    page_token: input.paginationToken,
                },
                userContext
            );

            if (response.status === "OK") {
                // Pagination info is in the Link header, containing comma-separated links:
                // "first", "next" (if applicable).
                // Example: Link: </admin/clients?page_size=5&page_token=token1>; rel="first", </admin/clients?page_size=5&page_token=token2>; rel="next"

                // We parse the nextPaginationToken from the Link header using RegExp
                let nextPaginationToken: string | undefined;
                const linkHeader = response.headers.get("link");

                const nextLinkMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                if (nextLinkMatch) {
                    const url = nextLinkMatch[1];
                    const urlParams = new URLSearchParams(url.split("?")[1]);
                    nextPaginationToken = urlParams.get("page_token") as string;
                }

                return {
                    status: "OK",
                    clients: response.data.map((client: any) => OAuth2Client.fromAPIResponse(client)),
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
                new NormalisedURLPath(`/recipe/oauth2/admin/clients`),
                transformObjectKeys(input, "snake-case"),
                userContext
            );

            if (response.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client.fromAPIResponse(response.data),
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
            const requestBody = Object.entries(input).reduce<
                Array<{ from: string; op: "replace"; path: string; value: any }>
            >((result, [key, value]) => {
                result.push({
                    from: `/${toSnakeCase(key)}`,
                    op: "replace",
                    path: `/${toSnakeCase(key)}`,
                    value,
                });
                return result;
            }, []);

            let response = await querier.sendPatchRequest(
                new NormalisedURLPath(`/recipe/oauth2/admin/clients/${input.clientId}`),
                requestBody,
                userContext
            );

            if (response.status === "OK") {
                return {
                    status: "OK",
                    client: OAuth2Client.fromAPIResponse(response.data),
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
                new NormalisedURLPath(`/recipe/oauth2/admin/clients/${input.clientId}`),
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
