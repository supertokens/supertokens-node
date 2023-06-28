// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import { NormalisedAppinfo } from "../../types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import { GeneralErrorResponse } from "../../types";
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
    requireEmail?: boolean;
    generateFakeEmail?: (input: { thirdPartyUserId: string; userContext: any }) => Promise<string>;
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
export declare type User = {
    id: string;
    timeJoined: number;
    email: string;
    thirdParty: {
        id: string;
        userId: string;
    };
    tenantIds: string[];
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
    getUserById(input: { userId: string; userContext: any }): Promise<User | undefined>;
    getUsersByEmail(input: { email: string; tenantId: string; userContext: any }): Promise<User[]>;
    getUserByThirdPartyInfo(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        tenantId: string;
        userContext: any;
    }): Promise<User | undefined>;
    getProvider(input: {
        thirdPartyId: string;
        tenantId: string;
        clientType?: string;
        userContext: any;
    }): Promise<{
        status: "OK";
        provider: TypeProvider;
        thirdPartyEnabled: boolean;
    }>;
    signInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
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
    }): Promise<{
        status: "OK";
        createdNewUser: boolean;
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
    }>;
    manuallyCreateOrUpdateUser(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        tenantId: string;
        userContext: any;
    }): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;
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
                    createdNewUser: boolean;
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
