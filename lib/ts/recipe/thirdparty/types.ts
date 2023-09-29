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
import { NormalisedAppinfo } from "../../types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import { GeneralErrorResponse, User } from "../../types";
import RecipeUserId from "../../recipeUserId";

export type UserInfo = {
    thirdPartyUserId: string;
    email?: { id: string; isVerified: boolean };
    rawUserInfoFromProvider: { fromIdTokenPayload?: { [key: string]: any }; fromUserInfoAPI?: { [key: string]: any } };
};

export type UserInfoMap = {
    fromIdTokenPayload?: {
        userId?: string;
        email?: string;
        emailVerified?: string;
    };
    fromUserInfoAPI?: {
        userId?: string;
        email?: string;
        emailVerified?: string;
    };
};

export type ProviderClientConfig = {
    clientType?: string;
    clientId: string;
    clientSecret?: string;
    scope?: string[];
    forcePKCE?: boolean;
    additionalConfig?: { [key: string]: any };
};

type CommonProviderConfig = {
    thirdPartyId: string;
    name?: string;

    authorizationEndpoint?: string;
    authorizationEndpointQueryParams?: { [key: string]: string | null };
    tokenEndpoint?: string;
    tokenEndpointBodyParams?: { [key: string]: string };
    userInfoEndpoint?: string;
    userInfoEndpointQueryParams?: { [key: string]: string | null };
    userInfoEndpointHeaders?: { [key: string]: string | null };
    jwksURI?: string;
    oidcDiscoveryEndpoint?: string;
    userInfoMap?: UserInfoMap;
    validateIdTokenPayload?: (input: {
        idTokenPayload: { [key: string]: any };
        clientConfig: ProviderConfigForClientType;
        userContext: any;
    }) => Promise<void>;
    /**
     * This function is responsible for validating the access token received from the third party provider.
     * This check can include checking the expiry of the access token, checking the audience of the access token, etc.
     *
     * This function should throw an error if the access token should be considered invalid, or return nothing if it is valid
     *
     * @param input.accessToken The access token to be validated
     * @param input.clientConfig The configuration provided for the third party provider when initialising SuperTokens
     * @param input.userContext Refer to https://supertokens.com/docs/thirdparty/advanced-customizations/user-context
     */
    validateAccessToken?: (input: {
        accessToken: string;
        clientConfig: ProviderConfigForClientType;
        userContext: any;
    }) => Promise<void>;
    requireEmail?: boolean;
    generateFakeEmail?: (input: { thirdPartyUserId: string; tenantId: string; userContext: any }) => Promise<string>;
};

export type ProviderConfigForClientType = ProviderClientConfig & CommonProviderConfig;

export type TypeProvider = {
    id: string;
    config: ProviderConfigForClientType;

    getConfigForClientType: (input: { clientType?: string; userContext: any }) => Promise<ProviderConfigForClientType>;
    getAuthorisationRedirectURL: (input: {
        redirectURIOnProviderDashboard: string;
        userContext: any;
    }) => Promise<{ urlWithQueryParams: string; pkceCodeVerifier?: string }>;
    exchangeAuthCodeForOAuthTokens: (input: {
        redirectURIInfo: {
            redirectURIOnProviderDashboard: string;
            redirectURIQueryParams: any;
            pkceCodeVerifier?: string;
        };
        userContext: any;
    }) => Promise<any>;
    getUserInfo: (input: { oAuthTokens: any; userContext: any }) => Promise<UserInfo>;
};

export type ProviderConfig = CommonProviderConfig & {
    clients?: ProviderClientConfig[];
};

export type ProviderInput = {
    config: ProviderConfig;
    override?: (originalImplementation: TypeProvider) => TypeProvider;
};

export type TypeInputSignInAndUp = {
    providers?: ProviderInput[];
};

export type TypeNormalisedInputSignInAndUp = {
    providers: ProviderInput[];
};

export type TypeInput = {
    signInAndUpFeature?: TypeInputSignInAndUp;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    signInAndUpFeature: TypeNormalisedInputSignInAndUp;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    getProvider(input: {
        thirdPartyId: string;
        tenantId: string;
        clientType?: string;
        userContext: any;
    }): Promise<TypeProvider | undefined>;

    signInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        isVerified: boolean;
        oAuthTokens: { [key: string]: any };
        rawUserInfoFromProvider: {
            fromIdTokenPayload?: { [key: string]: any };
            fromUserInfoAPI?: { [key: string]: any };
        };
        tenantId: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              recipeUserId: RecipeUserId;
              user: User;
              oAuthTokens: { [key: string]: any };
              rawUserInfoFromProvider: {
                  fromIdTokenPayload?: { [key: string]: any };
                  fromUserInfoAPI?: { [key: string]: any };
              };
          }
        | {
              status: "SIGN_IN_UP_NOT_ALLOWED";
              reason: string;
          }
    >;

    manuallyCreateOrUpdateUser(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        isVerified: boolean;
        tenantId: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
        | {
              status: "SIGN_IN_UP_NOT_ALLOWED";
              reason: string;
          }
    >;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    providers: ProviderInput[];
    req: BaseRequest;
    res: BaseResponse;
    appInfo: NormalisedAppinfo;
};

export type APIInterface = {
    authorisationUrlGET:
        | undefined
        | ((input: {
              provider: TypeProvider;
              redirectURIOnProviderDashboard: string;
              tenantId: string;
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    urlWithQueryParams: string;
                    pkceCodeVerifier?: string;
                }
              | GeneralErrorResponse
          >);

    signInUpPOST:
        | undefined
        | ((
              input: {
                  provider: TypeProvider;
                  tenantId: string;
                  options: APIOptions;
                  userContext: any;
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
                    createdNewRecipeUser: boolean;
                    user: User;
                    session: SessionContainerInterface;
                    oAuthTokens: { [key: string]: any };
                    rawUserInfoFromProvider: {
                        fromIdTokenPayload?: { [key: string]: any };
                        fromUserInfoAPI?: { [key: string]: any };
                    };
                }
              | { status: "NO_EMAIL_GIVEN_BY_PROVIDER" }
              | {
                    status: "SIGN_IN_UP_NOT_ALLOWED";
                    reason: string;
                }
              | GeneralErrorResponse
          >);

    appleRedirectHandlerPOST:
        | undefined
        | ((input: {
              formPostInfoFromProvider: { [key: string]: any };
              options: APIOptions;
              userContext: any;
          }) => Promise<void>);
};
