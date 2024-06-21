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

import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { NonNullableProperties, UserContext } from "../../types";
import { OAuth2Client } from "./OAuth2Client";

export type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};

export type RecipeInterface = {
    createOAuth2Client(
        input: CreateOAuth2ClientInput,
        userContext: UserContext
    ): Promise<
        | {
              status: "OK";
              client: OAuth2Client;
          }
        // TODO: Define specific error types once requirements are clearer
        | {
              status: "ERROR";
              error: string;
              errorHint: string;
          }
    >;
    updateOAuth2Client(
        input: UpdateOAuth2ClientInput,
        userContext: UserContext
    ): Promise<
        | {
              status: "OK";
              client: OAuth2Client;
          }
        // TODO: Define specific error types once requirements are clearer
        | {
              status: "ERROR";
              error: string;
              errorHint: string;
          }
    >;
    deleteOAuth2Client(
        input: DeleteOAuth2ClientInput,
        userContext: UserContext
    ): Promise<
        | {
              status: "OK";
          }
        // TODO: Define specific error types once requirements are clearer
        | {
              status: "ERROR";
              error: string;
              errorHint: string;
          }
    >;
};

export type APIInterface = {};

export type OAuth2ClientOptions = {
    clientId: string;
    clientSecret: string;
    clientName: string;
    scope: string;
    redirectUris?: string[] | null;

    authorizationCodeGrantAccessTokenLifespan?: string | null;
    authorizationCodeGrantIdTokenLifespan?: string | null;
    authorizationCodeGrantRefreshTokenLifespan?: string | null;
    clientCredentialsGrantAccessTokenLifespan?: string | null;
    implicitGrantAccessTokenLifespan?: string | null;
    implicitGrantIdTokenLifespan?: string | null;
    jwtBearerGrantAccessTokenLifespan?: string | null;
    refreshTokenGrantAccessTokenLifespan?: string | null;
    refreshTokenGrantIdTokenLifespan?: string | null;
    refreshTokenGrantRefreshTokenLifespan?: string | null;

    tokenEndpointAuthMethod: string;
    tokenEndpointAuthSigningAlg?: string;
    accessTokenStrategy?: "jwt" | "opaque";

    backchannelLogoutSessionRequired?: boolean;
    backchannelLogoutUri?: string;
    frontchannelLogoutSessionRequired?: boolean;
    frontchannelLogoutUri?: string;
    requestObjectSigningAlg?: string;
    sectorIdentifierUri?: string;
    userinfoSignedResponseAlg: string;

    jwks?: Record<any, any>;
    jwksUri?: string;
    owner?: string;
    clientUri?: string;
    allowedCorsOrigins?: string[];
    audience?: string[];
    grantTypes?: string[] | null;
    postLogoutRedirectUris?: string[];
    requestUris?: string[];
    responseTypes?: string[] | null;
    contacts?: string[] | null;
    logoUri?: string;
    policyUri?: string;
    tosUri?: string;
    skipConsent?: boolean;
    skipLogoutConsent?: boolean | null;
    subjectType: string;
    createdAt: string;
    updatedAt: string;
    registrationAccessToken: string;
    registrationClientUri: string;
    metadata?: Record<string, any>;
};

export type CreateOAuth2ClientInput = Partial<Omit<OAuth2ClientOptions, "createdAt" | "updatedAt">>;

export type UpdateOAuth2ClientInput = NonNullableProperties<
    Omit<
        CreateOAuth2ClientInput,
        | "redirectUris"
        | "grantTypes"
        | "postLogoutRedirectUris"
        | "requestUris"
        | "responseTypes"
        | "contacts"
        | "registrationAccessToken"
        | "registrationClientUri"
        | "metadata"
    >
> & {
    redirectUris?: string[] | null;
    grantTypes?: string[] | null;
    postLogoutRedirectUris?: string[] | null;
    requestUris?: string[] | null;
    responseTypes?: string[] | null;
    contacts?: string[] | null;
    registrationAccessToken?: string | null;
    registrationClientUri?: string | null;
    metadata?: Record<string, any> | null;
};

export type DeleteOAuth2ClientInput = {
    clientId: string;
};
