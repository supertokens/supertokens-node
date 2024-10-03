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
import { RecipeInterface } from "./types";
import JWTRecipe from "../jwt/recipe";
import NormalisedURLPath from "../../normalisedURLPath";
import { GET_JWKS_API } from "../jwt/constants";
import { NormalisedAppinfo, UserContext } from "../../types";
import {
    AUTH_PATH,
    END_SESSION_PATH,
    INTROSPECT_TOKEN_PATH,
    REVOKE_TOKEN_PATH,
    TOKEN_PATH,
    USER_INFO_PATH,
} from "../oauth2provider/constants";

export default function getRecipeInterface(appInfo: NormalisedAppinfo): RecipeInterface {
    return {
        getOpenIdDiscoveryConfiguration: async function () {
            let issuer = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
            let jwks_uri =
                appInfo.apiDomain.getAsStringDangerous() +
                appInfo.apiBasePath.appendPath(new NormalisedURLPath(GET_JWKS_API)).getAsStringDangerous();

            const apiBasePath = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
            return {
                status: "OK",
                issuer,
                jwks_uri,
                authorization_endpoint: apiBasePath + AUTH_PATH,
                token_endpoint: apiBasePath + TOKEN_PATH,
                userinfo_endpoint: apiBasePath + USER_INFO_PATH,
                revocation_endpoint: apiBasePath + REVOKE_TOKEN_PATH,
                token_introspection_endpoint: apiBasePath + INTROSPECT_TOKEN_PATH,
                end_session_endpoint: apiBasePath + END_SESSION_PATH,
                subject_types_supported: ["public"],
                id_token_signing_alg_values_supported: ["RS256"],
                response_types_supported: ["code", "id_token", "id_token token"],
            };
        },
        createJWT: async function (
            this: RecipeInterface,
            {
                payload,
                validitySeconds,
                useStaticSigningKey,
                userContext,
            }: {
                payload?: any;
                validitySeconds?: number;
                useStaticSigningKey?: boolean;
                userContext: UserContext;
            }
        ): Promise<
            | {
                  status: "OK";
                  jwt: string;
              }
            | {
                  status: "UNSUPPORTED_ALGORITHM_ERROR";
              }
        > {
            payload = payload === undefined || payload === null ? {} : payload;

            let issuer = (await this.getOpenIdDiscoveryConfiguration({ userContext })).issuer;
            return await JWTRecipe.getInstanceOrThrowError().recipeInterfaceImpl.createJWT({
                payload: {
                    iss: issuer,
                    ...payload,
                },
                useStaticSigningKey,
                validitySeconds,
                userContext,
            });
        },
    };
}
