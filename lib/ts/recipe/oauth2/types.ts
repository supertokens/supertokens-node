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
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, JSONObject } from "../../types";
import { SessionContainer, SessionInformation } from "../session";

export type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};

export type APIInterface = {
    tokenPOST(input: {
        clientId: string;
        grantType: GrantType;
        clientSecret?: string;
        code?: string;
        codeVerifier?: string;
        refreshToken?: string;
        redirectUri?: string;
        scope: string[];

        queryString: string;
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
    // The OpenId spec states that we have to support both POST and GET
    authorizeGET(input: {
        clientId: string;
        responseType: ResponseType[];
        redirectUri: string;
        scope: string[];
        state?: string;

        // PKCE
        codeChallenge?: string;
        codeChallengeMethod?: CodeChallengeMethod;

        queryString: string;
        session?: SessionContainer;

        options: APIOptions;
        userContext: any;
    }): Promise<
        | {
              redirectUrl: string; // This will end up as a 302, encoding both error and success
          }
        | GeneralErrorResponse
    >;
    authorizePOST(input: {
        clientId: string;
        responseType: ResponseType[]; // add enum
        redirectUri: string;
        scope: string[];
        state?: string;

        // PKCE
        codeChallenge?: string;
        codeChallengeMethod?: CodeChallengeMethod;

        queryString: string;
        session?: SessionContainer;

        options: APIOptions;
        userContext: any;
    }): Promise<
        | {
              redirectUrl: string; // This will end up as a 302, encoding both error and success
          }
        | GeneralErrorResponse
    >;

    userInfoGET(input: {
        oauth2AccessToken: string;
        options: APIOptions;
        userContext: any;
    }): Promise<JSONObject | { status: "UNAUTHORISED_ERROR"; message: string }>;
};

export type RecipeInterface = {
    getUserInfo(input: {
        oauth2AccessToken: string;

        userContext: any;
    }): Promise<{ status: "OK"; info: JSONObject } | { status: "UNAUTHORISED_ERROR" }>;

    createAuthCode(input: {
        clientId: string;
        responseTypes: ResponseType[];
        sessionHandle: string;
        redirectUri?: string;
        scopes: string[];

        // PKCE
        codeChallenge?: string;
        codeChallengeMethod?: CodeChallengeMethod;

        queryString: string;

        userContext: any;
    }): Promise<
        // State is added into the url on the endpoint level
        | {
              status: "OK";
              code?: string;
              idToken?: string;
          }
        | { status: "CLIENT_ERROR"; error: AuthorizationErrorCode; errorDescription?: string; errorURI?: string } // these are redirected back to the client
        | { status: "AUTH_ERROR"; error: string } // This gets a redirection to the auth frontend
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
                  scopes?: string[];

                  queryString: string;

                  userContext: any;
              }
            | {
                  clientId: string;
                  grantType: "client_credentials";
                  clientSecret: string;
                  scopes?: string[];

                  queryString: string;

                  userContext: any;
              }
            | {
                  clientId: string;
                  grantType: "refresh_token";
                  clientSecret?: string;
                  refreshToken?: string;
                  scopes?: string[];

                  queryString: string;

                  userContext: any;
              }
    ): Promise<
        // State is added into the url on the endpoint level
        | {
              status: "OK";
              tokenType: "Bearer";
              accessToken: string;
              refreshToken?: string;
              idToken?: string;
              expiresIn: number;
          }
        | { status: "CLIENT_ERROR"; error: TokensErrorCode } // This results in a 400 with the error code added. The status specifies that this is a client error to be consistent with the createAuthCode
    >;

    verifyAccessTokenFromDatabase(input: {
        clientId: string;
        accessToken: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              tokenInfo: TokenInfo;
          }
        | {
              status: "UNAUTHORISED_ERROR";
          }
    >;

    getAuthCodeInfo(input: {
        clientId: string;
        authCode: string;
        userContext: any;
    }): Promise<{
        status: "OK";
        tokenInfo?: AuthCodeInfo;
    }>;

    getTokenInfoByRefreshToken(input: {
        clientId: string;
        refreshToken: string;
        userContext: any;
    }): Promise<{
        status: "OK";
        tokenInfo?: TokenInfo;
    }>;

    getIssuedTokens(input: {
        clientId: string;
        sessionHandle?: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              tokens: TokenInfo[];
          }
        | {
              status: "UNKNOWN_CLIENT_ID_ERROR";
          }
    >;

    revokeTokens(
        input:
            | { clientId: string; userContext: any }
            | { sessionHandle: string; userContext: any }
            | { accessToken: string; userContext: any }
    ): Promise<void>;
    revokeAuthCodes(
        input: { clientId: string; userContext: any } | { sessionHandle: string; userContext: any }
    ): Promise<void>;

    // Customization points called by createTokens&createAuthCode
    buildAccessToken(input: {
        tokenInfo: TokenBuilderInfo;
        sessionInformation?: SessionInformation;
        userContext: any;
    }): Promise<{ payload?: JSONObject; lifetimeInSecs?: number }>; // Returning undefined for these props means we use the default from Core
    buildIdToken(input: {
        tokenInfo: TokenBuilderInfo;
        sessionInformation?: SessionInformation;
        userContext: any;
    }): Promise<{ payload?: JSONObject; lifetimeInSecs?: number }>; // Returning undefined for these props means we use the defaults from BE SDKs
    getRefreshTokenLifetime(input: {
        tokenInfo: TokenBuilderInfo;
        sessionInformation?: SessionInformation;
        userContext: any;
    }): Promise<number | undefined>; // Returning undefined means we use the default from Core

    validateScopes(input: {
        tokenInfo: TokenBuilderInfo;
        sessionInformation?: SessionInformation;
        userContext: any;
    }): Promise<
        | { status: "OK"; grantedScopes: string[] }
        | { status: "INVALID_SCOPE_ERROR"; message: string } // Returning this signifies a client error and should result in a redirection back to the client with the "invalid_scope" error
        | { status: "ACCESS_DENIED_ERROR"; message: string } // This means we need to redirect to the auth frontend (i.e.: there is a claim validation issue we can resolve there)
    >;

    shouldIssueRefreshToken(input: {
        tokenInfo: TokenBuilderInfo;
        sessionInformation?: SessionInformation;
        userContext: any;
    }): Promise<boolean>;
};

export type TokenBuilderInfo = {
    clientId: string;
    sessionHandle?: string;
    scopes: string[];
    queryString?: string;
};

export type AuthCodeInfo = TokenBuilderInfo & {
    timeCreatedMs: number;
    timeExpiresMs: number;
    accessType: "offline" | "online";
    authorizationCodeHash: string;
    codeChallenge: string;
    codeChallengeMethod: "S256";
};

export type TokenInfo = TokenBuilderInfo & {
    accessTokenHash: string;
    refreshTokenHash?: string;
    timeCreatedMs: number;
    lastUpdatedMs: number;
    timeAccessTokenExpiresMs: number;
    timeRefreshTokenExpiresMs?: number;
};

export type ResponseType = "code" | "id_token" | "token"; // We do not support "token", but it's a possible input value.
export type CodeChallengeMethod = "S256";

export type GrantType = "authorization_code" | "client_credentials" | "refresh_token" | "password"; // We do not support "password", but it's a possible input value.
export type OAuthPromptType = "none" | "login" | "consent" | "select_account";
export type AuthorizationErrorCode =
    | "invalid_request"
    | "unauthorized_client"
    | "access_denied"
    | "unsupported_response_type"
    | "invalid_scope"
    | "server_error"
    | "temporarily_unavailable";

export type TokensErrorCode =
    | "invalid_request"
    | "invalid_client"
    | "invalid_grant"
    | "unsupported_grant_type"
    | "invalid_scope";
