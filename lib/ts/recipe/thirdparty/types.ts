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
import { NormalisedAppinfo, UserContext } from "../../types";
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
    codeChallengeMethodsSupported?: string[];
    oidcDiscoveryEndpoint?: string;
    userInfoMap?: UserInfoMap;
    validateIdTokenPayload?: (input: {
        idTokenPayload: { [key: string]: any };
        clientConfig: ProviderConfigForClientType;
        userContext: UserContext;
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
        userContext: UserContext;
    }) => Promise<void>;
    requireEmail?: boolean;
    generateFakeEmail?: (input: {
        thirdPartyUserId: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<string>;
};

export type ProviderConfigForClientType = ProviderClientConfig & CommonProviderConfig;

export type TypeProvider = {
    id: string;
    config: ProviderConfigForClientType;

    getConfigForClientType: (input: {
        clientType?: string;
        userContext?: UserContext;
    }) => Promise<ProviderConfigForClientType>;
    getAuthorisationRedirectURL: (input: {
        redirectURIOnProviderDashboard: string;
        userContext?: UserContext;
    }) => Promise<{ urlWithQueryParams: string; pkceCodeVerifier?: string }>;
    exchangeAuthCodeForOAuthTokens: (input: {
        redirectURIInfo: {
            redirectURIOnProviderDashboard: string;
            redirectURIQueryParams: Record<string, string>;
            pkceCodeVerifier?: string;
        };
        userContext?: UserContext;
    }) => Promise<any>;
    getUserInfo: (input: { oAuthTokens: any; userContext?: UserContext }) => Promise<UserInfo>;
};

export type ProviderConfig = CommonProviderConfig & {
    clients?: ProviderClientConfig[];
};

export type ProviderInput = {
    config: ProviderConfig;
    includeInNonPublicTenantsByDefault?: boolean;
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
    /**
     * Decides whether the Apple form_post callback may redirect the user to `frontendRedirectURI` (taken from the
     * `state` sent to Apple). If set, this replaces the default check, which only allows absolute http(s) URLs whose
     * protocol, host and port match the configured `origin` / `websiteDomain`.
     *
     * Set this if your `origin` depends on the request (the callback arrives as a POST from Apple, so request based
     * origin resolution may not identify your frontend), if one backend serves several frontends, or to allow mobile
     * redirect targets (universal / app links or custom-scheme deep links such as `myapp://callback`).
     *
     * Returning `true` allows the redirect, returning `false` rejects the request with a 400 and no redirect.
     * Errors thrown from this function are propagated and no redirect is done.
     *
     * The `frontendRedirectURI` must be an absolute URL. `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`,
     * `about:` and `filesystem:` URLs are always rejected, without calling this function.
     *
     * `frontendRedirectURI` is passed in the form we redirect to: the WHATWG URL serialisation of the value in `state`
     * (`new URL(value).toString()`), without the fields Apple posted, which are added to its query afterwards. So dot
     * segments in the path are resolved (also percent-encoded ones, such as `%2e%2e`) and the scheme is lowercased, and
     * for http(s) URLs the host is lowercased and punycode (IDNA) encoded, the default port is dropped and an empty
     * path becomes `/` (e.g.: `HTTPS://App.Example.com:443/a/%2e%2e/cb` becomes `https://app.example.com/cb`).
     * Adding the posted fields re-encodes the query string already in the URL (as `application/x-www-form-urlencoded`,
     * e.g.: `?a=b%20c&flag` becomes `?a=b+c&flag=`) and replaces parameters named like a posted field, so the query of
     * the redirect can differ from the query of `frontendRedirectURI`.
     * The whole `state` is chosen by whoever starts the sign in, so treat `frontendRedirectURI` as untrusted: parse it
     * (e.g.: with `new URL(frontendRedirectURI)`) and compare its protocol, host, port and path with the values you
     * allow, instead of comparing it as a string. Do not use prefix or substring checks: for example,
     * `https://app.example.com.evil.test/` and `https://app.example.com@evil.test/` both start with
     * `https://app.example.com`, and in `intent://callback#Intent;package=...;end` the receiving app is chosen by the
     * fragment.
     *
     * The redirect carries the authorization code and the `id_token` from Apple. Custom URL schemes are not owned by
     * a single app: any app installed on the device can register the same scheme and receive them. Prefer verified
     * https universal / app links for mobile redirects where possible.
     */
    isValidFrontendRedirectURI?: (input: {
        frontendRedirectURI: string;
        request: BaseRequest;
        userContext: UserContext;
    }) => Promise<boolean> | boolean;
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
    isValidFrontendRedirectURI?: (input: {
        frontendRedirectURI: string;
        request: BaseRequest;
        userContext: UserContext;
    }) => Promise<boolean> | boolean;
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
        userContext: UserContext;
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
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext: UserContext;
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
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;

    manuallyCreateOrUpdateUser(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        isVerified: boolean;
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext: UserContext;
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
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
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
              userContext: UserContext;
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
                  session: SessionContainerInterface | undefined;
                  shouldTryLinkingWithSessionUser: boolean | undefined;
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
              userContext: UserContext;
          }) => Promise<void>);
};
