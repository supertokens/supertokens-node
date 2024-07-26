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
import { RecipeInterface, TypeNormalisedInput } from "./types";
import { RecipeInterface as JWTRecipeInterface, JsonWebKey } from "../jwt/types";
import NormalisedURLPath from "../../normalisedURLPath";
import { GET_JWKS_API } from "../jwt/constants";
import { NormalisedAppinfo, UserContext } from "../../types";
import { AUTH_PATH, TOKEN_PATH, USER_INFO_PATH } from "../oauth2/constants";

export default function getRecipeInterface(
    config: TypeNormalisedInput,
    jwtRecipeImplementation: JWTRecipeInterface,
    appInfo: NormalisedAppinfo
): RecipeInterface {
    return {
        getOpenIdDiscoveryConfiguration: async function () {
            let issuer = config.issuerDomain.getAsStringDangerous() + config.issuerPath.getAsStringDangerous();
            let jwks_uri =
                config.issuerDomain.getAsStringDangerous() +
                config.issuerPath.appendPath(new NormalisedURLPath(GET_JWKS_API)).getAsStringDangerous();

            const apiBasePath = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
            return {
                status: "OK",
                issuer,
                jwks_uri,
                authorization_endpoint: apiBasePath + AUTH_PATH,
                token_endpoint: apiBasePath + TOKEN_PATH,
                userinfo_endpoint: apiBasePath + USER_INFO_PATH,
                subject_types_supported: ["public"],
                id_token_signing_alg_values_supported: ["RS256"],
                response_types_supported: ["code", "id_token", "id_token token"],
            };
        },
        createJWT: async function ({
            payload,
            validitySeconds,
            useStaticSigningKey,
            userContext,
        }: {
            payload?: any;
            validitySeconds?: number;
            useStaticSigningKey?: boolean;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  jwt: string;
              }
            | {
                  status: "UNSUPPORTED_ALGORITHM_ERROR";
              }
        > {
            payload = payload === undefined || payload === null ? {} : payload;

            let issuer = config.issuerDomain.getAsStringDangerous() + config.issuerPath.getAsStringDangerous();
            return await jwtRecipeImplementation.createJWT({
                payload: {
                    iss: issuer,
                    ...payload,
                },
                useStaticSigningKey,
                validitySeconds,
                userContext,
            });
        },
        getJWKS: async function (input): Promise<{ keys: JsonWebKey[] }> {
            return await jwtRecipeImplementation.getJWKS(input);
        },
    };
}
