/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, JSONObject, JSONValue, NonNullableProperties, UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
import { OAuth2Client } from "./OAuth2Client";
import { User } from "../../user";
import RecipeUserId from "../../recipeUserId";

export type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
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

export type ErrorOAuth2 = {
    status: "ERROR";

    // The error should follow the OAuth2 error format (e.g. invalid_request, login_required).
    // Defaults to request_denied.
    error: string;

    // Description of the error in a human readable format.
    errorDescription: string;

    // Represents the HTTP status code of the error (e.g. 401 or 403)
    // Defaults to 400
    statusCode?: number;
};

export type ConsentRequest = {
    // ACR represents the Authentication AuthorizationContext Class Reference value for this authentication session. You can use it to express that, for example, a user authenticated using two factor authentication.
    acr?: string;

    // Array of strings
    amr?: string[];

    // ID is the identifier ("authorization challenge") of the consent authorization request. It is used to identify the session.
    challenge: string;

    // OAuth 2.0 Clients are used to perform OAuth 2.0 and OpenID Connect flows. Usually, OAuth 2.0 clients are generated for applications which want to consume your OAuth 2.0 or OpenID Connect capabilities.
    client?: OAuth2Client;

    // any json serializable object
    context?: JSONObject;

    // LoginChallenge is the login challenge this consent challenge belongs to. It can be used to associate a login and consent request in the login & consent app.
    loginChallenge?: string;

    // LoginSessionID is the login session ID.
    loginSessionId?: string;

    // object (Contains optional information about the OpenID Connect request.)
    oidcContext?: any;

    // Array of strings
    requestedAccessTokenAudience?: string[];

    // Array of strings
    requestedScope?: string[];

    // Skip, if true, implies that the client has requested the same scopes from the same user previously. If true, you must not ask the user to grant the requested scopes. You must however either allow or deny the consent request using the usual API call.
    skip?: boolean;

    // Subject is the user ID of the end-user that authenticated. Now, that end user needs to grant or deny the scope requested by the OAuth 2.0 client.
    subject?: string;
};

export type LoginRequest = {
    // ID is the identifier ("login challenge") of the login request. It is used to identify the session.
    challenge: string;

    // OAuth 2.0 Clients are used to perform OAuth 2.0 and OpenID Connect flows. Usually, OAuth 2.0 clients are generated for applications which want to consume your OAuth 2.0 or OpenID Connect capabilities.
    client: OAuth2Client;

    // object (Contains optional information about the OpenID Connect request.)
    oidcContext?: any;

    // RequestURL is the original OAuth 2.0 Authorization URL requested by the OAuth 2.0 client. It is the URL which initiates the OAuth 2.0 Authorization Code or OAuth 2.0 Implicit flow. This URL is typically not needed, but might come in handy if you want to deal with additional request parameters.
    requestUrl: string;

    // Array of strings
    requestedAccessTokenAudience?: string[];

    // Array of strings
    requestedScope?: string[];

    // SessionID is the login session ID.
    sessionId?: string;

    // Skip, if true, implies that the client has requested the same scopes from the same user previously. If true, you can skip asking the user to grant the requested scopes, and simply forward the user to the redirect URL.
    // This feature allows you to update / set session information.
    skip: boolean;

    // Subject is the user ID of the end-user that authenticated. Now, that end user needs to grant or deny the scope requested by the OAuth 2.0 client. If this value is set and skip is true, you MUST include this subject type when accepting the login request, or the request will fail.
    subject: string;
};

export type TokenInfo = {
    // The access token issued by the authorization server.
    access_token?: string;
    // The lifetime in seconds of the access token (integer). For example, the value "3600" denotes that the access token will expire in one hour from the time the response was generated.
    expires_in: number;
    // To retrieve a refresh token request the id_token scope.
    id_token?: string;
    // The refresh token, which can be used to obtain new access tokens. To retrieve it add the scope "offline" to your access token request.
    refresh_token?: string;
    // The scope of the access token
    scope: string;
    // The type of the token issued
    token_type: string;
};

export type LoginInfo = {
    clientId: string;
    // The name of the client.
    clientName: string;
    // The URI of the client's terms of service.
    tosUri?: string;
    // The URI of the client's privacy policy.
    policyUri?: string;
    // The URI of the client's logo.
    logoUri?: string;
    // The URI of the client
    clientUri?: string;
    // The metadata associated with the client.
    metadata?: Record<string, any> | null;
};

export type UserInfo = {
    sub: string;
    email?: string;
    email_verified?: boolean;
    phoneNumber?: string;
    phoneNumber_verified?: boolean;
    [key: string]: JSONValue;
};

export type InstrospectTokenResponse = { active: false } | ({ active: true } & JSONObject);

export type RecipeInterface = {
    authorization(input: {
        params: Record<string, string>;
        cookies: string | undefined;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
    }): Promise<{ redirectTo: string; cookies: string[] | undefined } | ErrorOAuth2>;
    tokenExchange(input: {
        authorizationHeader?: string;
        body: Record<string, string | undefined>;
        userContext: UserContext;
    }): Promise<TokenInfo | ErrorOAuth2>;
    getConsentRequest(input: { challenge: string; userContext: UserContext }): Promise<ConsentRequest>;
    acceptConsentRequest(input: {
        challenge: string;

        // any json serializable object
        context?: any;
        // Array of strings
        grantAccessTokenAudience?: string[];
        // Array of strings
        grantScope?: string[];
        // string <date-time> (NullTime implements sql.NullTime functionality.)
        handledAt?: string;

        tenantId: string;
        rsub: string;
        sessionHandle: string;
        initialAccessTokenPayload: JSONObject | undefined;
        initialIdTokenPayload: JSONObject | undefined;

        userContext: UserContext;
    }): Promise<{ redirectTo: string }>;

    rejectConsentRequest(input: {
        challenge: string;
        error: ErrorOAuth2;
        userContext: UserContext;
    }): Promise<{ redirectTo: string }>;

    getLoginRequest(input: {
        challenge: string;
        userContext: UserContext;
    }): Promise<(LoginRequest & { status: "OK" }) | ErrorOAuth2>;
    acceptLoginRequest(input: {
        challenge: string;

        // ACR sets the Authentication AuthorizationContext Class Reference value for this authentication session. You can use it to express that, for example, a user authenticated using two factor authentication.
        acr?: string;

        // Array of strings
        amr?: string[];

        // any json serializable object
        context?: any;

        // Extend OAuth2 authentication session lifespan
        // If set to true, the OAuth2 authentication cookie lifespan is extended. This is for example useful if you want the user to be able to use prompt=none continuously.
        // This value can only be set to true if the user has an authentication, which is the case if the skip value is true.
        extendSessionLifespan?: boolean;

        // IdentityProviderSessionID is the session ID of the end-user that authenticated.
        identityProviderSessionId?: string;

        // Subject is the user ID of the end-user that authenticated.
        subject: string;
        userContext: UserContext;
    }): Promise<{ redirectTo: string }>;
    rejectLoginRequest(input: {
        challenge: string;
        error: ErrorOAuth2;
        userContext: UserContext;
    }): Promise<{ redirectTo: string }>;

    getOAuth2Client(input: {
        clientId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              client: OAuth2Client;
          }
        | {
              status: "ERROR";
              error: string;
              errorDescription: string;
          }
    >;
    getOAuth2Clients(
        input: GetOAuth2ClientsInput & {
            userContext: UserContext;
        }
    ): Promise<
        | {
              status: "OK";
              clients: Array<OAuth2Client>;
              nextPaginationToken?: string;
          }
        | {
              status: "ERROR";
              error: string;
              errorDescription: string;
          }
    >;
    createOAuth2Client(
        input: CreateOAuth2ClientInput & {
            userContext: UserContext;
        }
    ): Promise<
        | {
              status: "OK";
              client: OAuth2Client;
          }
        | {
              status: "ERROR";
              error: string;
              errorDescription: string;
          }
    >;
    updateOAuth2Client(
        input: UpdateOAuth2ClientInput & {
            userContext: UserContext;
        }
    ): Promise<
        | {
              status: "OK";
              client: OAuth2Client;
          }
        | {
              status: "ERROR";
              error: string;
              errorDescription: string;
          }
    >;
    deleteOAuth2Client(
        input: DeleteOAuth2ClientInput & {
            userContext: UserContext;
        }
    ): Promise<
        | {
              status: "OK";
          }
        | {
              status: "ERROR";
              error: string;
              errorDescription: string;
          }
    >;

    validateOAuth2AccessToken(input: {
        token: string;
        requirements?: {
            clientId?: string;
            scopes?: string[];
            audience?: string;
        };
        checkDatabase?: boolean;
        userContext: UserContext;
    }): Promise<{ status: "OK"; payload: JSONObject }>;

    getRequestedScopes(input: {
        recipeUserId: RecipeUserId | undefined;
        sessionHandle: string | undefined;
        scopeParam: string[];
        clientId: string;
        userContext: UserContext;
    }): Promise<string[]>;
    buildAccessTokenPayload(input: {
        user: User | undefined;
        client: OAuth2Client;
        sessionHandle: string | undefined;
        scopes: string[];
        userContext: UserContext;
    }): Promise<JSONObject>;
    buildIdTokenPayload(input: {
        user: User | undefined;
        client: OAuth2Client;
        sessionHandle: string | undefined;
        scopes: string[];
        userContext: UserContext;
    }): Promise<JSONObject>;
    buildUserInfo(input: {
        user: User;
        accessTokenPayload: JSONObject;
        scopes: string[];
        tenantId: string;
        userContext: UserContext;
    }): Promise<JSONObject>;
    getFrontendRedirectionURL(
        input:
            | {
                  type: "login";
                  loginChallenge: string;
                  tenantId: string;
                  forceFreshAuth: boolean;
                  hint: string | undefined;
                  userContext: UserContext;
              }
            | {
                  type: "try-refresh";
                  loginChallenge: string;
                  userContext: UserContext;
              }
            | {
                  type: "logout-confirmation";
                  logoutChallenge: string;
                  userContext: UserContext;
              }
            | {
                  type: "post-logout-fallback";
                  userContext: UserContext;
              }
    ): Promise<string>;
    revokeToken(
        input: {
            token: string;
            userContext: UserContext;
        } & (
            | {
                  authorizationHeader: string;
              }
            | { clientId: string; clientSecret?: string }
        )
    ): Promise<{ status: "OK" } | ErrorOAuth2>;
    revokeTokensByClientId(input: { clientId: string; userContext: UserContext }): Promise<{ status: "OK" }>;
    revokeTokensBySessionHandle(input: { sessionHandle: string; userContext: UserContext }): Promise<{ status: "OK" }>;
    introspectToken(input: {
        token: string;
        scopes?: string[];
        userContext: UserContext;
    }): Promise<InstrospectTokenResponse>;
    endSession(input: {
        params: Record<string, string>;
        session?: SessionContainerInterface;
        shouldTryRefresh: boolean;
        userContext: UserContext;
    }): Promise<{ redirectTo: string } | ErrorOAuth2>;
    acceptLogoutRequest(input: {
        challenge: string;
        userContext: UserContext;
    }): Promise<{ redirectTo: string } | ErrorOAuth2>;
    rejectLogoutRequest(input: { challenge: string; userContext: UserContext }): Promise<{ status: "OK" }>;
};

export type APIInterface = {
    loginGET:
        | undefined
        | ((input: {
              loginChallenge: string;
              options: APIOptions;
              session?: SessionContainerInterface;
              shouldTryRefresh: boolean;
              userContext: UserContext;
          }) => Promise<{ frontendRedirectTo: string; cookies?: string[] } | ErrorOAuth2 | GeneralErrorResponse>);

    authGET:
        | undefined
        | ((input: {
              params: any;
              cookie: string | undefined;
              session: SessionContainerInterface | undefined;
              shouldTryRefresh: boolean;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<{ redirectTo: string; cookies?: string[] } | ErrorOAuth2 | GeneralErrorResponse>);
    tokenPOST:
        | undefined
        | ((input: {
              authorizationHeader?: string;
              body: any;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<TokenInfo | ErrorOAuth2 | GeneralErrorResponse>);
    loginInfoGET:
        | undefined
        | ((input: {
              loginChallenge: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<{ status: "OK"; info: LoginInfo } | ErrorOAuth2 | GeneralErrorResponse>);
    userInfoGET:
        | undefined
        | ((input: {
              accessTokenPayload: JSONObject;
              user: User;
              scopes: string[];
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<JSONObject | GeneralErrorResponse>);
    revokeTokenPOST:
        | undefined
        | ((
              input: {
                  token: string;
                  options: APIOptions;
                  userContext: UserContext;
              } & ({ authorizationHeader: string } | { clientId: string; clientSecret?: string })
          ) => Promise<{ status: "OK" } | ErrorOAuth2>);
    introspectTokenPOST:
        | undefined
        | ((input: {
              token: string;
              scopes?: string[];
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<InstrospectTokenResponse | GeneralErrorResponse>);
    endSessionGET:
        | undefined
        | ((input: {
              params: Record<string, string>;
              session?: SessionContainerInterface;
              shouldTryRefresh: boolean;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<{ redirectTo: string } | ErrorOAuth2 | GeneralErrorResponse>);
    endSessionPOST:
        | undefined
        | ((input: {
              params: Record<string, string>;
              session?: SessionContainerInterface;
              shouldTryRefresh: boolean;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<{ redirectTo: string } | ErrorOAuth2 | GeneralErrorResponse>);
    logoutPOST:
        | undefined
        | ((input: {
              logoutChallenge: string;
              options: APIOptions;
              session?: SessionContainerInterface;
              userContext: UserContext;
          }) => Promise<{ status: "OK"; frontendRedirectTo: string } | ErrorOAuth2 | GeneralErrorResponse>);
};

export type OAuth2ClientOptions = {
    clientId: string;
    clientSecret?: string;
    createdAt: string;
    updatedAt: string;

    clientName: string;

    scope: string;
    redirectUris?: string[] | null;
    postLogoutRedirectUris?: string[];

    authorizationCodeGrantAccessTokenLifespan?: string | null;
    authorizationCodeGrantIdTokenLifespan?: string | null;
    authorizationCodeGrantRefreshTokenLifespan?: string | null;
    clientCredentialsGrantAccessTokenLifespan?: string | null;
    implicitGrantAccessTokenLifespan?: string | null;
    implicitGrantIdTokenLifespan?: string | null;
    refreshTokenGrantAccessTokenLifespan?: string | null;
    refreshTokenGrantIdTokenLifespan?: string | null;
    refreshTokenGrantRefreshTokenLifespan?: string | null;

    tokenEndpointAuthMethod: string;

    audience?: string[];
    grantTypes?: string[] | null;
    responseTypes?: string[] | null;

    clientUri?: string;
    logoUri?: string;
    policyUri?: string;
    tosUri?: string;
    metadata?: Record<string, any>;
    enableRefreshTokenRotation?: boolean;
};

export type GetOAuth2ClientsInput = {
    /**
     * Items per Page. Defaults to 250.
     */
    pageSize?: number;

    /**
     * Next Page Token. Defaults to "1".
     */
    paginationToken?: string;

    /**
     * The name of the clients to filter by.
     */
    clientName?: string;
};

export type CreateOAuth2ClientInput = Partial<Omit<OAuth2ClientOptions, "createdAt" | "updatedAt">>;

export type UpdateOAuth2ClientInput = NonNullableProperties<
    Omit<CreateOAuth2ClientInput, "redirectUris" | "grantTypes" | "responseTypes" | "metadata">
> & {
    clientId: string;
    redirectUris?: string[] | null;
    grantTypes?: string[] | null;
    responseTypes?: string[] | null;
    metadata?: Record<string, any> | null;
};

export type DeleteOAuth2ClientInput = {
    clientId: string;
};

export type PayloadBuilderFunction = (
    user: User,
    scopes: string[],
    sessionHandle: string,
    userContext: UserContext
) => Promise<JSONObject>;
export type UserInfoBuilderFunction = (
    user: User,
    accessTokenPayload: JSONObject,
    scopes: string[],
    tenantId: string,
    userContext: UserContext
) => Promise<JSONObject>;
