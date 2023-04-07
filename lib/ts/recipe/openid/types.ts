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
import OverrideableBuilder from "supertokens-js-override";
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLDomain from "../../normalisedURLDomain";
import NormalisedURLPath from "../../normalisedURLPath";
import { RecipeInterface as JWTRecipeInterface, APIInterface as JWTAPIInterface, JsonWebKey } from "../jwt/types";
import { GeneralErrorResponse } from "../../types";

export type TypeInput = {
    issuer?: string;
    jwtValiditySeconds?: number;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
        jwtFeature?: {
            functions?: (
                originalImplementation: JWTRecipeInterface,
                builder?: OverrideableBuilder<JWTRecipeInterface>
            ) => JWTRecipeInterface;
            apis?: (
                originalImplementation: JWTAPIInterface,
                builder?: OverrideableBuilder<JWTAPIInterface>
            ) => JWTAPIInterface;
        };
    };
};

export type TypeNormalisedInput = {
    issuerDomain: NormalisedURLDomain;
    issuerPath: NormalisedURLPath;
    jwtValiditySeconds?: number;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
        jwtFeature?: {
            functions?: (
                originalImplementation: JWTRecipeInterface,
                builder?: OverrideableBuilder<JWTRecipeInterface>
            ) => JWTRecipeInterface;
            apis?: (
                originalImplementation: JWTAPIInterface,
                builder?: OverrideableBuilder<JWTAPIInterface>
            ) => JWTAPIInterface;
        };
    };
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    req: BaseRequest;
    res: BaseResponse;
};

export type APIInterface = {
    getOpenIdDiscoveryConfigurationGET:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    issuer: string;
                    jwks_uri: string;
                }
              | GeneralErrorResponse
          >);
};

export type RecipeInterface = {
    getOpenIdDiscoveryConfiguration(input: {
        userContext: any;
    }): Promise<{
        status: "OK";
        issuer: string;
        jwks_uri: string;
    }>;
    createJWT(input: {
        payload?: any;
        validitySeconds?: number;
        useStaticSigningKey?: boolean;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              jwt: string;
          }
        | {
              status: "UNSUPPORTED_ALGORITHM_ERROR";
          }
    >;

    getJWKS(input: {
        userContext: any;
    }): Promise<{
        keys: JsonWebKey[];
    }>;
};
