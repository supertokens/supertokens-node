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

import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, JSONObject } from "../../types";

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
    tokensPOST(input: {
        payload?: any;
        validitySeconds?: number;
        useStaticSigningKey?: boolean;
        userContext: any;
    }): Promise<
        | {
              token_type: "Bearer";
              access_token: string;
              refresh_token?: string;
              id_token?: string;
              expires_in: number;
          }
        | GeneralErrorResponse
    >;
    // The OpenId spec states that we have to support both POST and GET
    authorizeGET(input: {
        clientId: string;
        responseType: string;
        redirectUri?: string;
        scopes: string[];
        state?: string;

        // PKCE
        codeChallenge?: string;
        codeChallengeMethod?: string;

        // OpenIdConnect
        prompt?: string;
        nonce?: string;

        // Not sure if we want to support these
        acr_values?: string;
        maxAge?: number;

        options: APIOptions;
        userContext: any;
    }): Promise<{
        redirectUrl: string; // This will end up as a 302, encoding both error and success
    }>;
    authorizePOST(input: {
        clientId: string;
        responseType: string;
        redirectUri?: string;
        scopes: string[];
        state?: string;

        // PKCE
        codeChallenge?: string;
        codeChallengeMethod?: string;

        // OpenIdConnect
        prompt?: string;
        nonce?: string;

        // Not sure if we want to support these
        acr_values?: string;
        maxAge?: number;

        options: APIOptions;
        userContext: any;
    }): Promise<{
        redirectUrl: string; // This will end up as a 302, encoding both error and success
    }>;
    // This is intended to be used when we want to do the redirection in the FE (e.g.: header based auth)
    getRedirectUrlPOST(input: {
        clientId: string;
        responseType: string;
        redirectUri?: string;
        scopes: string[];
        state?: string;

        // PKCE
        codeChallenge?: string;
        codeChallengeMethod?: string;

        // OpenIdConnect
        prompt?: string;
        nonce?: string;

        // Not sure if we want to support these
        acr_values?: string;
        maxAge?: number;

        options: APIOptions;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              redirectUrl: string;
          }
        | GeneralErrorResponse
    >;

    userInfoGET(input: {
        options: APIOptions;
        userContext: any;
    }): Promise<{ status: "OK"; sub: string; email?: string; email_verified?: boolean; phoneNumber?: string }>; // We should define this in a way that doesn't require adding all claims here
};

export type APIInterface = {
    buildAccessToken(input: {
        clientId: string;
        userId?: string;
        sessionHandle?: string;
        scopes: string[];
    }): Promise<{ payload?: JSONObject; lifetimeInSecs?: number }>; // Returning undefined for these props means we use the default from Core
    buildIdToken(input: {
        clientId: string;
        userId?: string;
        sessionHandle?: string;
        scopes: string[];
    }): Promise<{ payload?: JSONObject; lifetimeInSecs?: number }>; // Returning undefined for these props means we use the defaults from BE SDKs
    getRefreshTokenLifetime(): Promise<number | undefined>; // Returning undefined means we use the default from Core

    buildAuthorizeRedirectUrl(input: {
        clientId: string;
        redirectUri: string;
        error?: string;
        code?: string;
        idToken?: string;
    }): Promise<string>;

    validateScopes(input: {
        clientId: string;
        userId?: string;
        sessionHandle?: string;
        scopes: string[];
    }): Promise<{ status: "OK"; grantedScopes: string[] } | { status: "SCOPE_ERROR"; message: string }>;
};
