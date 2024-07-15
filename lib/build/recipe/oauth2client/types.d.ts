// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import { NormalisedAppinfo, UserContext } from "../../types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import { GeneralErrorResponse, User } from "../../types";
import RecipeUserId from "../../recipeUserId";
export declare type UserInfo = {
    userId: string;
    rawUserInfoFromProvider: {
        fromIdTokenPayload?: {
            [key: string]: any;
        };
        fromUserInfoAPI?: {
            [key: string]: any;
        };
    };
};
export declare type ProviderConfigInput = {
    clientId: string;
    clientSecret: string;
    authorizationEndpointQueryParams?: {
        [key: string]: string | null;
    };
    oidcDiscoveryEndpoint: string;
    scope?: string[];
    forcePKCE?: boolean;
};
export declare type ProviderConfigWithOIDCInfo = ProviderConfigInput & {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
    jwksURI: string;
};
export declare type OAuthTokens = {
    access_token?: string;
    id_token?: string;
};
export declare type OAuthTokenResponse = {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type: string;
};
export declare type TypeInput = {
    providerConfig: ProviderConfigInput;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    providerConfig: ProviderConfigInput;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    getAuthorisationRedirectURL(input: {
        providerConfig: ProviderConfigWithOIDCInfo;
        redirectURIOnProviderDashboard: string;
        userContext: UserContext;
    }): Promise<{
        urlWithQueryParams: string;
        pkceCodeVerifier?: string;
    }>;
    getProviderConfig(input: { userContext: UserContext }): Promise<ProviderConfigWithOIDCInfo>;
    signIn(input: {
        userId: string;
        oAuthTokens: OAuthTokens;
        rawUserInfoFromProvider: {
            fromIdTokenPayload?: {
                [key: string]: any;
            };
            fromUserInfoAPI?: {
                [key: string]: any;
            };
        };
        tenantId: string;
        userContext: UserContext;
    }): Promise<{
        status: "OK";
        recipeUserId: RecipeUserId;
        user: User;
        oAuthTokens: OAuthTokens;
        rawUserInfoFromProvider: {
            fromIdTokenPayload?: {
                [key: string]: any;
            };
            fromUserInfoAPI?: {
                [key: string]: any;
            };
        };
    }>;
    exchangeAuthCodeForOAuthTokens(input: {
        providerConfig: ProviderConfigWithOIDCInfo;
        redirectURIInfo: {
            redirectURIOnProviderDashboard: string;
            redirectURIQueryParams: any;
            pkceCodeVerifier?: string | undefined;
        };
        userContext: UserContext;
    }): Promise<OAuthTokenResponse>;
    getUserInfo(input: {
        providerConfig: ProviderConfigWithOIDCInfo;
        oAuthTokens: OAuthTokens;
        userContext: UserContext;
    }): Promise<UserInfo>;
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    appInfo: NormalisedAppinfo;
};
export declare type APIInterface = {
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
                  oAuthTokens: {
                      [key: string]: any;
                  };
              }
        )
    ) => Promise<
        | {
              status: "OK";
              user: User;
              session: SessionContainerInterface;
              oAuthTokens: {
                  [key: string]: any;
              };
              rawUserInfoFromProvider: {
                  fromIdTokenPayload?: {
                      [key: string]: any;
                  };
                  fromUserInfoAPI?: {
                      [key: string]: any;
                  };
              };
          }
        | GeneralErrorResponse
    >;
};
