// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, JSONObject } from "../../types";
export declare type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export declare type RecipeInterface = {
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
    authorizeGET(input: {
        clientId: string;
        responseType: string;
        redirectUri?: string;
        scopes: string[];
        state?: string;
        codeChallenge?: string;
        codeChallengeMethod?: string;
        prompt?: string;
        nonce?: string;
        acr_values?: string;
        maxAge?: number;
        options: APIOptions;
        userContext: any;
    }): Promise<{
        redirectUrl: string;
    }>;
    authorizePOST(input: {
        clientId: string;
        responseType: string;
        redirectUri?: string;
        scopes: string[];
        state?: string;
        codeChallenge?: string;
        codeChallengeMethod?: string;
        prompt?: string;
        nonce?: string;
        acr_values?: string;
        maxAge?: number;
        options: APIOptions;
        userContext: any;
    }): Promise<{
        redirectUrl: string;
    }>;
    getRedirectUrlPOST(input: {
        clientId: string;
        responseType: string;
        redirectUri?: string;
        scopes: string[];
        state?: string;
        codeChallenge?: string;
        codeChallengeMethod?: string;
        prompt?: string;
        nonce?: string;
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
    }): Promise<{
        status: "OK";
        sub: string;
        email?: string;
        email_verified?: boolean;
        phoneNumber?: string;
    }>;
};
export declare type APIInterface = {
    buildAccessToken(input: {
        clientId: string;
        userId?: string;
        sessionHandle?: string;
        scopes: string[];
    }): Promise<{
        payload?: JSONObject;
        lifetimeInSecs?: number;
    }>;
    buildIdToken(input: {
        clientId: string;
        userId?: string;
        sessionHandle?: string;
        scopes: string[];
    }): Promise<{
        payload?: JSONObject;
        lifetimeInSecs?: number;
    }>;
    getRefreshTokenLifetime(): Promise<number | undefined>;
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
    }): Promise<
        | {
              status: "OK";
              grantedScopes: string[];
          }
        | {
              status: "SCOPE_ERROR";
              message: string;
          }
    >;
};
