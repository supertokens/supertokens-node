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
import { NormalisedAppinfo } from "../../types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import { GeneralErrorResponse } from "../../types";

export type UserInfo = {
    thirdPartyUserId: string;
    email?: { id: string; isVerified: boolean };
    rawUserInfoFromProvider?: { fromIdTokenPayload: any; fromUserInfoAPI: any };
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

export type ProviderConfigForClientType = {
    clientID: string;
    clientSecret?: string;
    scope: string[];
    forcePKCE?: boolean;
    additionalConfig?: any;

    authorizationEndpoint?: string;
    authorizationEndpointQueryParams?: any;
    tokenEndpoint?: string;
    tokenEndpointBodyParams?: any;
    userInfoEndpoint?: string;
    userInfoEndpointQueryParams?: any;
    userInfoEndpointHeaders?: any;
    jwksURI?: string;
    oidcDiscoveryEndpoint?: string;
    userInfoMap?: UserInfoMap;
    validateIdTokenPayload?: (input: {
        idTokenPayload: any;
        clientConfig: ProviderConfigForClientType;
    }) => Promise<void>;
    tenantId?: string;
};

export type TypeProvider = {
    id: string;

    getConfigForClientType: (input: { clientType?: string; userContext?: any }) => Promise<ProviderConfigForClientType>;
    getAuthorisationRedirectURL: (input: {
        config: ProviderConfigForClientType;
        redirectURIOnProviderDashboard: string;
        userContext: any;
    }) => Promise<{ urlWithQueryParams: string; pkceCodeVerifier?: string }>;
    exchangeAuthCodeForOAuthTokens: (input: {
        config: ProviderConfigForClientType;
        redirectURIInfo: {
            redirectURIOnProviderDashboard: string;
            redirectURIQueryParams: any;
            pkceCodeVerifier?: string;
        };
        userContext: any;
    }) => Promise<any>;
    getUserInfo: (input: {
        config: ProviderConfigForClientType;
        oAuthTokens: any;
        userContext: any;
    }) => Promise<UserInfo>;
};

export type User = {
    // https://github.com/supertokens/core-driver-interface/wiki#third-party-user
    id: string;
    timeJoined: number;
    email: string;
    thirdParty: {
        id: string;
        userId: string;
    };
};

export type ProviderClientConfig = {
    clientType?: string;
    clientID: string;
    clientSecret?: string;
    scope?: string[];
    forcePKCE?: boolean;
    additionalConfig?: any;
};

export type ProviderConfig = {
    tenantId?: string;
    thirdPartyId: string;
    name?: string;

    clients: ProviderClientConfig[];
    authorizationEndpoint?: string;
    authorizationEndpointQueryParams?: any;
    tokenEndpoint?: string;
    tokenEndpointBodyParams?: any;
    userInfoEndpoint?: string;
    userInfoEndpointQueryParams?: any;
    userInfoEndpointHeaders?: any;
    jwksURI?: string;
    oidcDiscoveryEndpoint?: string;
    userInfoMap?: UserInfoMap;

    validateIdTokenPayload?: (input: {
        idTokenPayload: any;
        clientConfig: ProviderConfigForClientType;
    }) => Promise<void>;
};

export type ProviderInput = {
    config: ProviderConfig;
    override?: (originalImplementation: TypeProvider) => TypeProvider;
};

export type TypeInputSignInAndUp = {
    providers: ProviderInput[];
};

export type TypeNormalisedInputSignInAndUp = {
    providers: ProviderInput[];
};

export type TypeInput = {
    signInAndUpFeature: TypeInputSignInAndUp;
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
    getUserById(input: { userId: string; userContext: any }): Promise<User | undefined>;

    getUsersByEmail(input: { email: string; userContext: any }): Promise<User[]>;

    getUserByThirdPartyInfo(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        userContext: any;
    }): Promise<User | undefined>;

    getProvider(input: {
        thirdPartyId: string;
        tenantId?: string;
        userContext: any;
    }): Promise<{ status: "OK"; provider: TypeProvider; thirdPartyEnabled: boolean }>;

    signInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        oAuthTokens: any;
        rawUserInfoFromProvider?: { fromIdTokenPayload: any; fromUserInfoAPI: any };
        userContext: any;
    }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }>;

    manuallyCreateOrUpdateUser(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        tenantId?: string;
        userContext: any;
    }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }>;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    providers: TypeProvider[];
    req: BaseRequest;
    res: BaseResponse;
    appInfo: NormalisedAppinfo;
};

export type APIInterface = {
    authorisationUrlGET:
        | undefined
        | ((input: {
              provider: TypeProvider;
              config: ProviderConfigForClientType;
              redirectURIOnProviderDashboard: string;
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
        | ((input: {
              provider: TypeProvider;
              config: ProviderConfigForClientType;

              // one of either redirectURIInfo or oAuthTokens
              redirectURIInfo?: {
                  redirectURIOnProviderDashboard: string;
                  redirectURIQueryParams: any;
                  pkceCodeVerifier?: string;
              };
              oAuthTokens?: any;
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    createdNewUser: boolean;
                    user: User;
                    session: SessionContainerInterface;
                    oAuthTokens: any;
                    rawUserInfoFromProvider?: { fromIdTokenPayload: any; fromUserInfoAPI: any };
                }
              | { status: "NO_EMAIL_GIVEN_BY_PROVIDER" }
              | GeneralErrorResponse
          >);

    appleRedirectHandlerPOST:
        | undefined
        | ((input: { formPostInfoFromProvider: any; options: APIOptions; userContext: any }) => Promise<void>);
};
