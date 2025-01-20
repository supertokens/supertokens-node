// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import { NormalisedAppinfo, UserContext } from "../../types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import { GeneralErrorResponse, User } from "../../types";
import RecipeUserId from "../../recipeUserId";
export declare type UserInfo = {
    userId: string;
    rawUserInfo: {
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
    clientSecret?: string;
    oidcDiscoveryEndpoint: string;
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
    providerConfigs: ProviderConfigInput[];
    override?: {
        functions?: (originalImplementation: RecipeInterface, builder?: OverrideableBuilder<RecipeInterface>) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    providerConfigs: ProviderConfigInput[];
    override: {
        functions: (originalImplementation: RecipeInterface, builder?: OverrideableBuilder<RecipeInterface>) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    getProviderConfig(input: {
        clientId: string;
        userContext: UserContext;
    }): Promise<ProviderConfigWithOIDCInfo>;
    signIn(input: {
        userId: string;
        oAuthTokens: OAuthTokens;
        rawUserInfo: {
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
        rawUserInfo: {
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
            redirectURI: string;
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
    signInPOST: (input: {
        tenantId: string;
        clientId?: string;
        options: APIOptions;
        userContext: UserContext;
    } & ({
        redirectURIInfo: {
            redirectURI: string;
            redirectURIQueryParams: any;
            pkceCodeVerifier?: string;
        };
    } | {
        oAuthTokens: {
            [key: string]: any;
        };
    })) => Promise<{
        status: "OK";
        user: User;
        session: SessionContainerInterface;
        oAuthTokens: {
            [key: string]: any;
        };
        rawUserInfo: {
            fromIdTokenPayload?: {
                [key: string]: any;
            };
            fromUserInfoAPI?: {
                [key: string]: any;
            };
        };
    } | GeneralErrorResponse>;
};
