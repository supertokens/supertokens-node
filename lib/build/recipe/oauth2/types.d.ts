// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, JSONObject } from "../../types";
import { SessionContainer } from "../session";
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
export declare type APIInterface = {
    tokenPOST(input: {
        clientId: string;
        grantType: GrantType;
        clientSecret?: string;
        code?: string;
        codeVerifier?: string;
        refreshToken?: string;
        redirectUri?: string;
        scope: string[];
        options: APIOptions;
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
        responseType: ResponseType[];
        redirectUri: string;
        scope: string[];
        state?: string;
        codeChallenge?: string;
        codeChallengeMethod?: CodeChallengeMethod;
        prompt?: OAuthPromptType;
        nonce?: string;
        session?: SessionContainer;
        options: APIOptions;
        userContext: any;
    }): Promise<
        | {
              redirectUrl: string;
          }
        | GeneralErrorResponse
    >;
    authorizePOST(input: {
        clientId: string;
        responseType: ResponseType[];
        redirectUri: string;
        scope: string[];
        state?: string;
        codeChallenge?: string;
        codeChallengeMethod?: CodeChallengeMethod;
        prompt?: OAuthPromptType;
        nonce?: string;
        session?: SessionContainer;
        options: APIOptions;
        userContext: any;
    }): Promise<
        | {
              redirectUrl: string;
          }
        | GeneralErrorResponse
    >;
    userInfoGET(input: {
        oauth2AccessToken: string;
        options: APIOptions;
        userContext: any;
    }): Promise<
        | JSONObject
        | {
              status: "UNAUTHORISED";
              message: string;
          }
    >;
};
export declare type RecipeInterface = {
    getUserInfo(input: { oauth2AccessToken: string; userContext: any }): Promise<JSONObject>;
    createAuthCode(input: {
        clientId: string;
        responseType: ResponseType;
        redirectUri?: string;
        scopes: string[];
        codeChallenge?: string;
        codeChallengeMethod?: CodeChallengeMethod;
        prompt?: OAuthPromptType;
        nonce?: string;
        allQueryParams: string;
        session: SessionContainer;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              code?: string;
              idToken?: string;
          }
        | {
              status: "CLIENT_ERROR";
              error: AuthorizationErrorCode;
              errorDescription: string;
              errorURI: string;
          }
        | {
              status: "AUTH_ERROR";
              error: string;
          }
    >;
    createTokens(
        input:
            | {
                  clientId: string;
                  grantType: "authorization_code";
                  clientSecret?: string;
                  code?: string;
                  codeVerifier?: string;
                  redirectUri: string;
                  scope?: string[];
                  allQueryParams: string;
                  userContext: any;
              }
            | {
                  clientId: string;
                  grantType: "client_credentials";
                  clientSecret: string;
                  scope?: string[];
                  userContext: any;
              }
            | {
                  clientId: string;
                  grantType: "refresh_token";
                  clientSecret?: string;
                  refreshToken?: string;
                  scope?: string[];
                  userContext: any;
              }
    ): Promise<
        | {
              status: "OK";
              tokenType: "Bearer";
              accessToken: string;
              refreshToken?: string;
              idToken?: string;
              expiresIn: number;
          }
        | {
              status: "CLIENT_ERROR";
              error: TokensErrorCode;
          }
    >;
    verifyAccessToken(input: {
        clientId: string;
        accessToken: string;
    }): Promise<{
        sessionHandle?: string;
        scopes: string[];
        timeCreated: number;
        lastUpdated: number;
        timeAccessTokenExpires: number;
        timeRefreshTokenExpires?: number;
    }>;
    getTokenInfo(input: {
        clientId: string;
        refreshToken?: string;
        authCode?: string;
    }): Promise<{
        sessionHandle?: string;
        scopes: string[];
        timeCreated: number;
        lastUpdated: number;
        timeAccessTokenExpires: number;
        timeRefreshTokenExpires?: number;
    }>;
    revokeToken(
        input:
            | {
                  clientId: string;
              }
            | {
                  sessionHandle: string;
              }
            | {
                  accessToken: string;
              }
    ): Promise<void>;
    revokeAuthCodes(
        input:
            | {
                  clientId: string;
              }
            | {
                  sessionHandle: string;
              }
    ): Promise<void>;
    buildAccessToken(input: {
        clientId: string;
        userId?: string;
        sessionHandle?: string;
        scopes: string[];
        userContext: any;
    }): Promise<{
        payload?: JSONObject;
        lifetimeInSecs?: number;
    }>;
    buildIdToken(input: {
        clientId: string;
        userId?: string;
        sessionHandle?: string;
        scopes: string[];
        userContext: any;
    }): Promise<{
        payload?: JSONObject;
        lifetimeInSecs?: number;
    }>;
    getRefreshTokenLifetime(): Promise<number | undefined>;
    validateScopes(input: {
        clientId: string;
        userId?: string;
        sessionHandle?: string;
        scopes: string[];
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              grantedScopes: string[];
          }
        | {
              status: "INVALID_SCOPE_ERROR";
              message: string;
          }
        | {
              status: "ACCESS_DENIED_ERROR";
              message: string;
          }
    >;
    shouldIssueRefreshToken(input: {
        clientId: string;
        userId?: string;
        sessionHandle?: string;
        scopes: string[];
        userContext: any;
    }): Promise<boolean>;
};
export declare type ResponseType = "code" | "id_token" | "token";
export declare type CodeChallengeMethod = "S256";
export declare type GrantType = "authorization_code" | "client_credentials" | "refresh_token" | "password";
export declare type OAuthPromptType = "none" | "login" | "consent" | "select_account";
export declare type AuthorizationErrorCode =
    | "invalid_request"
    | "unauthorized_client"
    | "access_denied"
    | "unsupported_response_type"
    | "invalid_scope"
    | "server_error"
    | "temporarily_unavailable";
export declare type TokensErrorCode =
    | "invalid_request"
    | "invalid_client"
    | "invalid_grant"
    | "unsupported_grant_type"
    | "invalid_scope";
