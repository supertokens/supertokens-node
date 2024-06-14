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
import { toCamelCase } from "../../utils";
import { OAuth2Client } from "./OAuth2Client";
import { RecipeInterface, TypeNormalisedInput } from "./types";

export default function getRecipeInterface(
    querier: Querier,
    _config: TypeNormalisedInput,
    _appInfo: NormalisedAppinfo
): RecipeInterface {
    return {
        createOAuth2Client: async function (input, userContext) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/recipe/oauth2/admin/clients`),
                input,
                userContext
            );

            if (response.status === "OK") {
                const oAuth2ClientInput = Object.keys(response.data).reduce((result, key) => {
                    const camelCaseKey = toCamelCase(key);
                    result[camelCaseKey] = response.data[key];
                    return result;
                }, {} as any);

                const client = new OAuth2Client(oAuth2ClientInput);

                return {
                    status: "OK",
                    client,
                };
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
