// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import { NormalisedAppinfo } from "../../types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import { GeneralErrorResponse, User } from "../../types";
import RecipeUserId from "../../recipeUserId";
export declare type UserInfo = {
    thirdPartyUserId: string;
    email?: {
        id: string;
        isVerified: boolean;
    };
    rawUserInfoFromProvider: {
        fromIdTokenPayload?: {
            [key: string]: any;
        };
        fromUserInfoAPI?: {
            [key: string]: any;
        };
    };
};
export declare type UserInfoMap = {
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
export declare type ProviderClientConfig = {
    clientType?: string;
    clientId: string;
    clientSecret?: string;
    scope?: string[];
    forcePKCE?: boolean;
    additionalConfig?: {
        [key: string]: any;
    };
};
declare type CommonProviderConfig = {
    thirdPartyId: string;
    name?: string;
    authorizationEndpoint?: string;
    authorizationEndpointQueryParams?: {
        [key: string]: string | null;
    };
    tokenEndpoint?: string;
    tokenEndpointBodyParams?: {
        [key: string]: string;
    };
    userInfoEndpoint?: string;
    userInfoEndpointQueryParams?: {
        [key: string]: string | null;
    };
    userInfoEndpointHeaders?: {
        [key: string]: string | null;
    };
    jwksURI?: string;
    oidcDiscoveryEndpoint?: string;
    userInfoMap?: UserInfoMap;
    validateIdTokenPayload?: (input: {
        idTokenPayload: {
            [key: string]: any;
        };
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
export declare type ProviderConfigForClientType = ProviderClientConfig & CommonProviderConfig;
export declare type TypeProvider = {
    id: string;
    config: ProviderConfigForClientType;
    getConfigForClientType: (input: { clientType?: string; userContext: any }) => Promise<ProviderConfigForClientType>;
    getAuthorisationRedirectURL: (input: {
        redirectURIOnProviderDashboard: string;
        userContext: any;
    }) => Promise<{
        urlWithQueryParams: string;
        pkceCodeVerifier?: string;
    }>;
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
export declare type ProviderConfig = CommonProviderConfig & {
    clients?: ProviderClientConfig[];
};
export declare type ProviderInput = {
    config: ProviderConfig;
    override?: (originalImplementation: TypeProvider) => TypeProvider;
};
export declare type TypeInputSignInAndUp = {
    providers?: ProviderInput[];
};
export declare type TypeNormalisedInputSignInAndUp = {
    providers: ProviderInput[];
};
export declare type TypeInput = {
    signInAndUpFeature?: TypeInputSignInAndUp;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    signInAndUpFeature: TypeNormalisedInputSignInAndUp;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
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
        tenantId: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              recipeUserId: RecipeUserId;
              user: User;
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
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    providers: ProviderInput[];
    req: BaseRequest;
    res: BaseResponse;
    appInfo: NormalisedAppinfo;
};
export declare type APIInterface = {
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
                        oAuthTokens: {
                            [key: string]: any;
                        };
                    }
              )
          ) => Promise<
              | {
                    status: "OK";
                    createdNewRecipeUser: boolean;
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
              | {
                    status: "NO_EMAIL_GIVEN_BY_PROVIDER";
                }
              | {
                    status: "SIGN_IN_UP_NOT_ALLOWED";
                    reason: string;
                }
              | GeneralErrorResponse
          >);
    appleRedirectHandlerPOST:
        | undefined
        | ((input: {
              formPostInfoFromProvider: {
                  [key: string]: any;
              };
              options: APIOptions;
              userContext: any;
          }) => Promise<void>);
};
export {};
