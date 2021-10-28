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
import { JsonWebKey, RecipeInterface, TypeNormalisedInput } from "./types";

export default function getRecipeInterface(
    querier: Querier,
    config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo
): RecipeInterface {
    return {
        createJWT: async function ({
            payload,
            validitySeconds,
        }: {
            payload?: any;
            validitySeconds?: number;
        }): Promise<
            | {
                  status: "OK";
                  jwt: string;
              }
            | {
                  status: "UNSUPPORTED_ALGORITHM_ERROR";
              }
        > {
            if (validitySeconds === undefined) {
                // If the user does not provide a validity to this function and the config validity is also undefined, use 100 years (in seconds)
                validitySeconds = config.jwtValiditySeconds;
            }

            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/jwt"), {
                payload: payload ?? {},
                validity: validitySeconds,
                algorithm: "RS256",
                jwksDomain: appInfo.apiDomain.getAsStringDangerous(),
            });

            if (response.status === "OK") {
                return {
                    status: "OK",
                    jwt: response.jwt,
                };
            } else {
                return {
                    status: "UNSUPPORTED_ALGORITHM_ERROR",
                };
            }
        },

        getJWKS: async function (this: RecipeInterface): Promise<{ status: "OK"; keys: JsonWebKey[] }> {
            return await querier.sendGetRequest(new NormalisedURLPath("/recipe/jwt/jwks"), {});
        },
    };
}
