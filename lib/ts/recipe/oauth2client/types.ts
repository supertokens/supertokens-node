/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
import { NormalisedAppinfo, UserContext } from "../../types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import { GeneralErrorResponse, User } from "../../types";
import RecipeUserId from "../../recipeUserId";

export type UserInfo = {
    userId: string;
    rawUserInfoFromProvider: { fromIdTokenPayload?: { [key: string]: any }; fromUserInfoAPI?: { [key: string]: any } };
};

export type ProviderConfigInput = {
    clientId: string;
    clientSecret: string;
    authorizationEndpointQueryParams?: { [key: string]: string | null };
    oidcDiscoveryEndpoint: string;
    scope?: string[];
    forcePKCE?: boolean;
};

export type ProviderConfigWithOIDCInfo = ProviderConfigInput & {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
    jwksURI: string;
};

export type OAuthTokens = {
    access_token?: string;
    id_token?: string;
};

export type OAuthTokenResponse = {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type: string;
};

export type TypeInput = {
    providerConfig: ProviderConfigInput;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    providerConfig: ProviderConfigInput;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    getAuthorisationRedirectURL(
        redirectURIOnProviderDashboard: string,
        userContext: UserContext
    ): Promise<{
        urlWithQueryParams: string;
        pkceCodeVerifier?: string;
    }>;
    getProviderConfig(userContext: UserContext): Promise<ProviderConfigWithOIDCInfo>;

    signIn(
        userId: string,
        oAuthTokens: OAuthTokens,
        rawUserInfoFromProvider: {
            fromIdTokenPayload?: { [key: string]: any };
            fromUserInfoAPI?: { [key: string]: any };
        },
        tenantId: string,
        userContext: UserContext
    ): Promise<{
        status: "OK";
        recipeUserId: RecipeUserId;
        user: User;
        oAuthTokens: OAuthTokens;
        rawUserInfoFromProvider: {
            fromIdTokenPayload?: { [key: string]: any };
            fromUserInfoAPI?: { [key: string]: any };
        };
    }>;
    exchangeAuthCodeForOAuthTokens(
        redirectURIInfo: {
            redirectURIOnProviderDashboard: string;
            redirectURIQueryParams: any;
            pkceCodeVerifier?: string | undefined;
        },
        userContext: UserContext
    ): Promise<OAuthTokenResponse>;
    getUserInfo(oAuthTokens: OAuthTokens, userContext: UserContext): Promise<UserInfo>;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    appInfo: NormalisedAppinfo;
};

export type APIInterface = {
    authorisationUrlGET:
        | undefined
        | ((input: {
              redirectURIOnProviderDashboard: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    urlWithQueryParams: string;
                    pkceCodeVerifier?: string;
                }
              | GeneralErrorResponse
          >);

    signInPOST: (
        input: {
            tenantId: string;
            session: SessionContainerInterface | undefined;
            options: APIOptions;
            userContext: UserContext;
        } & (
            | {
                  redirectURIInfo: {
                      redirectURIOnProviderDashboard: string;
                      redirectURIQueryParams: any;
                      pkceCodeVerifier?: string;
                  };
              }
            | {
                  oAuthTokens: { [key: string]: any };
              }
        )
    ) => Promise<
        | {
              status: "OK";
              user: User;
              session: SessionContainerInterface;
              oAuthTokens: { [key: string]: any };
              rawUserInfoFromProvider: {
                  fromIdTokenPayload?: { [key: string]: any };
                  fromUserInfoAPI?: { [key: string]: any };
              };
          }
        | GeneralErrorResponse
    >;
};
