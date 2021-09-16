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
import { CreateJWTResponse, JsonWebKey, RecipeInterface, TypeNormalisedInput } from "./types";

export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    config: TypeNormalisedInput;

    constructor(querier: Querier, config: TypeNormalisedInput) {
        this.querier = querier;
        this.config = config;
    }

    createJWT = async ({ payload, validity }: { payload: any; validity?: number }): Promise<CreateJWTResponse> => {
        if (validity === undefined) {
            validity = this.config.jwtValidity;
        }

        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/jwt"), {
            payload,
            validity,
            algorithm: "RS256",
            jwksDomain: "", // TODO NEMI: get api domain and send here
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
    };

    getJWKS = async (): Promise<{ keys: JsonWebKey[] }> => {
        return await this.querier.sendGetRequest(new NormalisedURLPath("/recipe/jwt/jwks"), {});
    };
}
