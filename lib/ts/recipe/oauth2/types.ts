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
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, JSONObject, NonNullableProperties, UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
import { OAuth2Client } from "./OAuth2Client";

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

export type ErrorOAuth2 = {
    // The error should follow the OAuth2 error format (e.g. invalid_request, login_required).
    // Defaults to request_denied.
    error: string;

    // Description of the error in a human readable format.
    errorDescription: string;

    // Debug contains information to help resolve the problem as a developer. Usually not exposed to the public but only in the server logs.
    errorDebug?: string;

    // Hint to help resolve the error.
    errorHint?: string;

    // Represents the HTTP status code of the error (e.g. 401 or 403)
    // Defaults to 400
    statusCode?: number;
};

export type ConsentRequest = {
    // ACR represents the Authentication AuthorizationContext Class Reference value for this authentication session. You can use it to express that, for example, a user authenticated using two factor authentication.
    acr?: string;

    // Array of strings (StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.)
    amr?: string[];

    // ID is the identifier ("authorization challenge") of the consent authorization request. It is used to identify the session.
    challenge: string;

    // OAuth 2.0 Clients are used to perform OAuth 2.0 and OpenID Connect flows. Usually, OAuth 2.0 clients are generated for applications which want to consume your OAuth 2.0 or OpenID Connect capabilities.
    client?: OAuth2Client;

    // any (JSONRawMessage represents a json.RawMessage that works well with JSON, SQL, and Swagger.)
    context?: JSONObject;

    // LoginChallenge is the login challenge this consent challenge belongs to. It can be used to associate a login and consent request in the login & consent app.
    loginChallenge?: string;

    // LoginSessionID is the login session ID. If the user-agent reuses a login session (via cookie / remember flag) this ID will remain the same. If the user-agent did not have an existing authentication session (e.g. remember is false) this will be a new random value. This value is used as the "sid" parameter in the ID Token and in OIDC Front-/Back- channel logout. It's value can generally be used to associate consecutive login requests by a certain user.
    loginSessionId?: string;

    // object (Contains optional information about the OpenID Connect request.)
    oidcContext?: any;

    // RequestURL is the original OAuth 2.0 Authorization URL requested by the OAuth 2.0 client. It is the URL which initiates the OAuth 2.0 Authorization Code or OAuth 2.0 Implicit flow. This URL is typically not needed, but might come in handy if you want to deal with additional request parameters.
    requestUrl?: string;

    // Array of strings (StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.)
    requestedAccessTokenAudience?: string[];

    // Array of strings (StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.)
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

    // Array of strings (StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.)
    requestedAccessTokenAudience?: string[];

    // Array of strings (StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.)
    requestedScope?: string[];

    // SessionID is the login session ID. If the user-agent reuses a login session (via cookie / remember flag) this ID will remain the same. If the user-agent did not have an existing authentication session (e.g. remember is false) this will be a new random value. This value is used as the "sid" parameter in the ID Token and in OIDC Front-/Back- channel logout. It's value can generally be used to associate consecutive login requests by a certain user.
    sessionId?: string;

    // Skip, if true, implies that the client has requested the same scopes from the same user previously. If true, you can skip asking the user to grant the requested scopes, and simply forward the user to the redirect URL.
    // This feature allows you to update / set session information.
    skip: boolean;

    // Subject is the user ID of the end-user that authenticated. Now, that end user needs to grant or deny the scope requested by the OAuth 2.0 client. If this value is set and skip is true, you MUST include this subject type when accepting the login request, or the request will fail.
    subject: string;
};

export type LogoutRequest = {
    // Challenge is the identifier ("logout challenge") of the logout authentication request. It is used to identify the session.
    challenge: string;

    // OAuth 2.0 Clients are used to perform OAuth 2.0 and OpenID Connect flows. Usually, OAuth 2.0 clients are generated for applications which want to consume your OAuth 2.0 or OpenID Connect capabilities.
    client: OAuth2Client;

    // RequestURL is the original Logout URL requested.
    requestUrl: string;

    // RPInitiated is set to true if the request was initiated by a Relying Party (RP), also known as an OAuth 2.0 Client.
    rpInitiated: boolean;

    // SessionID is the login session ID that was requested to log out.
    sid: string;

    // Subject is the user for whom the logout was request.
    subject: string;
};

export type TokenInfo = {
    // The access token issued by the authorization server.
    accessToken: string;
    // The lifetime in seconds of the access token. For example, the value "3600" denotes that the access token will expire in one hour from the time the response was generated.
    // integer <int64>
    expiresIn: number;
    // To retrieve a refresh token request the id_token scope.
    idToken: string;
    // The refresh token, which can be used to obtain new access tokens. To retrieve it add the scope "offline" to your access token request.
    refreshToken: string;
    // The scope of the access token
    scope: string;
    // The type of the token issued
    tokenType: string;
};

export type RecipeInterface = {
    authorization(input: { params: any; userContext: UserContext }): Promise<{ redirectTo: string }>;
    token(input: { body: any; userContext: UserContext }): Promise<TokenInfo | ErrorOAuth2 | GeneralErrorResponse>;
    getConsentRequest(input: { challenge: string; userContext: UserContext }): Promise<ConsentRequest>;
    acceptConsentRequest(input: {
        challenge: string;

        // any (JSONRawMessage represents a json.RawMessage that works well with JSON, SQL, and Swagger.)
        context?: any;
        // Array of strings (StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.)
        grantAccessTokenAudience?: string[];
        // Array of strings (StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.)
        grantScope?: string[];
        // string <date-time> (NullTime implements sql.NullTime functionality.)
        handledAt?: string[];
        // Remember, if set to true, tells ORY Hydra to remember this consent authorization and reuse it if the same client asks the same user for the same, or a subset of, scope.
        remember?: boolean;

        // RememberFor sets how long the consent authorization should be remembered for in seconds. If set to 0, the authorization will be remembered indefinitely. integer <int64>
        rememberFor?: number;

        // object (Pass session data to a consent request.)
        session?: any;
        userContext: UserContext;
    }): Promise<{ redirectTo: string }>;

    rejectConsentRequest(input: {
        challenge: string;
        error: ErrorOAuth2;
        userContext: UserContext;
    }): Promise<{ redirectTo: string }>;

    getLoginRequest(input: { challenge: string; userContext: UserContext }): Promise<LoginRequest>;
    acceptLoginRequest(input: {
        challenge: string;

        // ACR sets the Authentication AuthorizationContext Class Reference value for this authentication session. You can use it to express that, for example, a user authenticated using two factor authentication.
        acr?: string;

        // Array of strings (StringSliceJSONFormat represents []string{} which is encoded to/from JSON for SQL storage.)
        amr?: string[];

        // any (JSONRawMessage represents a json.RawMessage that works well with JSON, SQL, and Swagger.)
        context?: any;

        // Extend OAuth2 authentication session lifespan
        // If set to true, the OAuth2 authentication cookie lifespan is extended. This is for example useful if you want the user to be able to use prompt=none continuously.
        // This value can only be set to true if the user has an authentication, which is the case if the skip value is true.
        extendSessionLifespan?: boolean;

        // ForceSubjectIdentifier forces the "pairwise" user ID of the end-user that authenticated. The "pairwise" user ID refers to the (Pairwise Identifier Algorithm)[http://openid.net/specs/openid-connect-core-1_0.html#PairwiseAlg] of the OpenID Connect specification. It allows you to set an obfuscated subject ("user") identifier that is unique to the client.
        // Please note that this changes the user ID on endpoint /userinfo and sub claim of the ID Token. It does not change the sub claim in the OAuth 2.0 Introspection.
        forceSubjectIdentifier?: string;

        // Per default, ORY Hydra handles this value with its own algorithm. In case you want to set this yourself you can use this field. Please note that setting this field has no effect if pairwise is not configured in ORY Hydra or the OAuth 2.0 Client does not expect a pairwise identifier (set via subject_type key in the client's configuration).
        // Please also be aware that ORY Hydra is unable to properly compute this value during authentication. This implies that you have to compute this value on every authentication process (probably depending on the client ID or some other unique value).
        // If you fail to compute the proper value, then authentication processes which have id_token_hint set might fail.

        // IdentityProviderSessionID is the session ID of the end-user that authenticated. If specified, we will use this value to propagate the logout.
        identityProviderSessionId?: string;

        // Remember, if set to true, tells ORY Hydra to remember this user by telling the user agent (browser) to store a cookie with authentication data. If the same user performs another OAuth 2.0 Authorization Request, he/she will not be asked to log in again.
        remember?: boolean;

        // RememberFor sets how long the authentication should be remembered for in seconds. If set to 0, the authorization will be remembered for the duration of the browser session (using a session cookie). integer <int64>
        rememberFor?: number;

        // Subject is the user ID of the end-user that authenticated.
        subject: string;
        userContext: UserContext;
    }): Promise<{ redirectTo: string }>;
    rejectLoginRequest(input: {
        challenge: string;
        error: ErrorOAuth2;
        userContext: UserContext;
    }): Promise<{ redirectTo: string }>;

    getLogoutRequest(input: { challenge: string; userContext: UserContext }): Promise<LogoutRequest>;
    acceptLogoutRequest(input: { challenge: string; userContext: UserContext }): Promise<{ redirectTo: string }>;
    rejectLogoutRequest(input: { challenge: string; userContext: UserContext }): Promise<void>;

    getOAuth2Clients(
        input: GetOAuth2ClientsInput,
        userContext: UserContext
    ): Promise<
        | {
              status: "OK";
              clients: Array<OAuth2Client>;
              nextPaginationToken?: string;
          }
        // TODO: Define specific error types once requirements are clearer
        | {
              status: "ERROR";
              error: string;
              errorHint: string;
          }
    >;
    createOAuth2Client(
        input: CreateOAuth2ClientInput,
        userContext: UserContext
    ): Promise<
        | {
              status: "OK";
              client: OAuth2Client;
          }
        // TODO: Define specific error types once requirements are clearer
        | {
              status: "ERROR";
              error: string;
              errorHint: string;
          }
    >;
    updateOAuth2Client(
        input: UpdateOAuth2ClientInput,
        userContext: UserContext
    ): Promise<
        | {
              status: "OK";
              client: OAuth2Client;
          }
        // TODO: Define specific error types once requirements are clearer
        | {
              status: "ERROR";
              error: string;
              errorHint: string;
          }
    >;
    deleteOAuth2Client(
        input: DeleteOAuth2ClientInput,
        userContext: UserContext
    ): Promise<
        | {
              status: "OK";
          }
        // TODO: Define specific error types once requirements are clearer
        | {
              status: "ERROR";
              error: string;
              errorHint: string;
          }
    >;
};

export type APIInterface = {
    // TODO: add json versions?
    loginGET:
        | undefined
        | ((input: {
              loginChallenge: string;
              options: APIOptions;
              session?: SessionContainerInterface;
              userContext: UserContext;
          }) => Promise<{ redirectTo: string } | GeneralErrorResponse>);

    loginPOST:
        | undefined
        | ((input: {
              loginChallenge: string;
              accept: boolean;
              session: SessionContainerInterface;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<{ redirectTo: string } | GeneralErrorResponse>);

    logoutGET:
        | undefined
        | ((input: {
              logoutChallenge: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<{ redirectTo: string } | GeneralErrorResponse>);

    logoutPOST:
        | undefined
        | ((input: {
              logoutChallenge: string;
              accept: boolean;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<{ redirectTo: string } | GeneralErrorResponse>);

    consentGET:
        | undefined
        | ((input: {
              consentChallenge: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<{ redirectTo: string } | GeneralErrorResponse>);

    consentPOST:
        | undefined
        | ((input: {
              consentChallenge: string;
              accept: boolean;
              grantScope: string[];
              remember: boolean;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<{ redirectTo: string } | GeneralErrorResponse>);
    authGET:
        | undefined
        | ((input: {
              params: any;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<{ redirectTo: string } | ErrorOAuth2 | GeneralErrorResponse>);
    tokenPOST:
        | undefined
        | ((input: {
              body: any;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<TokenInfo | ErrorOAuth2 | GeneralErrorResponse>);
};

export type OAuth2ClientOptions = {
    clientId: string;
    clientSecret: string;
    clientName: string;
    scope: string;
    redirectUris?: string[] | null;

    authorizationCodeGrantAccessTokenLifespan?: string | null;
    authorizationCodeGrantIdTokenLifespan?: string | null;
    authorizationCodeGrantRefreshTokenLifespan?: string | null;
    clientCredentialsGrantAccessTokenLifespan?: string | null;
    implicitGrantAccessTokenLifespan?: string | null;
    implicitGrantIdTokenLifespan?: string | null;
    jwtBearerGrantAccessTokenLifespan?: string | null;
    refreshTokenGrantAccessTokenLifespan?: string | null;
    refreshTokenGrantIdTokenLifespan?: string | null;
    refreshTokenGrantRefreshTokenLifespan?: string | null;

    tokenEndpointAuthMethod: string;
    tokenEndpointAuthSigningAlg?: string;
    accessTokenStrategy?: "jwt" | "opaque";

    backchannelLogoutSessionRequired?: boolean;
    backchannelLogoutUri?: string;
    frontchannelLogoutSessionRequired?: boolean;
    frontchannelLogoutUri?: string;
    requestObjectSigningAlg?: string;
    sectorIdentifierUri?: string;
    userinfoSignedResponseAlg: string;

    jwks?: Record<any, any>;
    jwksUri?: string;
    owner?: string;
    clientUri?: string;
    allowedCorsOrigins?: string[];
    audience?: string[];
    grantTypes?: string[] | null;
    postLogoutRedirectUris?: string[];
    requestUris?: string[];
    responseTypes?: string[] | null;
    contacts?: string[] | null;
    logoUri?: string;
    policyUri?: string;
    tosUri?: string;
    skipConsent?: boolean;
    skipLogoutConsent?: boolean | null;
    subjectType: string;
    createdAt: string;
    updatedAt: string;
    registrationAccessToken: string;
    registrationClientUri: string;
    metadata?: Record<string, any>;
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

    /**
     * The owner of the clients to filter by.
     */
    owner?: string;
};

export type CreateOAuth2ClientInput = Partial<Omit<OAuth2ClientOptions, "createdAt" | "updatedAt">>;

export type UpdateOAuth2ClientInput = NonNullableProperties<
    Omit<
        CreateOAuth2ClientInput,
        | "redirectUris"
        | "grantTypes"
        | "postLogoutRedirectUris"
        | "requestUris"
        | "responseTypes"
        | "contacts"
        | "registrationAccessToken"
        | "registrationClientUri"
        | "metadata"
    >
> & {
    redirectUris?: string[] | null;
    grantTypes?: string[] | null;
    postLogoutRedirectUris?: string[] | null;
    requestUris?: string[] | null;
    responseTypes?: string[] | null;
    contacts?: string[] | null;
    registrationAccessToken?: string | null;
    registrationClientUri?: string | null;
    metadata?: Record<string, any> | null;
};

export type DeleteOAuth2ClientInput = {
    clientId: string;
};
