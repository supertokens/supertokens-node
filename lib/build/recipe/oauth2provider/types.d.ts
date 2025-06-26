// @ts-nocheck
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
    error: string;
    errorDescription: string;
    statusCode?: number;
};
export type ConsentRequest = {
    acr?: string;
    amr?: string[];
    challenge: string;
    client?: OAuth2Client;
    context?: JSONObject;
    loginChallenge?: string;
    loginSessionId?: string;
    oidcContext?: any;
    requestedAccessTokenAudience?: string[];
    requestedScope?: string[];
    skip?: boolean;
    subject?: string;
};
export type LoginRequest = {
    challenge: string;
    client: OAuth2Client;
    oidcContext?: any;
    requestUrl: string;
    requestedAccessTokenAudience?: string[];
    requestedScope?: string[];
    sessionId?: string;
    skip: boolean;
    subject: string;
};
export type TokenInfo = {
    access_token?: string;
    expires_in: number;
    id_token?: string;
    refresh_token?: string;
    scope: string;
    token_type: string;
};
export type LoginInfo = {
    clientId: string;
    clientName: string;
    tosUri?: string;
    policyUri?: string;
    logoUri?: string;
    clientUri?: string;
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
export type InstrospectTokenResponse =
    | {
          active: false;
      }
    | ({
          active: true;
      } & JSONObject);
export type RecipeInterface = {
    authorization(input: {
        params: Record<string, string>;
        cookies: string | undefined;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
    }): Promise<
        | {
              redirectTo: string;
              cookies: string[] | undefined;
          }
        | ErrorOAuth2
    >;
    tokenExchange(input: {
        authorizationHeader?: string;
        body: Record<string, string | undefined>;
        userContext: UserContext;
    }): Promise<TokenInfo | ErrorOAuth2>;
    getConsentRequest(input: { challenge: string; userContext: UserContext }): Promise<ConsentRequest | ErrorOAuth2>;
    acceptConsentRequest(input: {
        challenge: string;
        context?: any;
        grantAccessTokenAudience?: string[];
        grantScope?: string[];
        handledAt?: string;
        tenantId: string;
        rsub: string;
        sessionHandle: string;
        initialAccessTokenPayload: JSONObject | undefined;
        initialIdTokenPayload: JSONObject | undefined;
        userContext: UserContext;
    }): Promise<
        | {
              redirectTo: string;
              status: "OK";
          }
        | ErrorOAuth2
    >;
    rejectConsentRequest(input: { challenge: string; error: ErrorOAuth2; userContext: UserContext }): Promise<
        | {
              redirectTo: string;
              status: "OK";
          }
        | ErrorOAuth2
    >;
    getLoginRequest(input: { challenge: string; userContext: UserContext }): Promise<
        | (LoginRequest & {
              status: "OK";
          })
        | ErrorOAuth2
    >;
    acceptLoginRequest(input: {
        challenge: string;
        acr?: string;
        amr?: string[];
        context?: any;
        extendSessionLifespan?: boolean;
        identityProviderSessionId?: string;
        subject: string;
        userContext: UserContext;
    }): Promise<
        | {
              redirectTo: string;
              status: "OK";
          }
        | ErrorOAuth2
    >;
    rejectLoginRequest(input: { challenge: string; error: ErrorOAuth2; userContext: UserContext }): Promise<
        | {
              redirectTo: string;
              status: "OK";
          }
        | ErrorOAuth2
    >;
    getOAuth2Client(input: { clientId: string; userContext: UserContext }): Promise<
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
    }): Promise<{
        status: "OK";
        payload: JSONObject;
    }>;
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
            | {
                  clientId: string;
                  clientSecret?: string;
              }
        )
    ): Promise<
        | {
              status: "OK";
          }
        | ErrorOAuth2
    >;
    revokeTokensByClientId(input: { clientId: string; userContext: UserContext }): Promise<{
        status: "OK";
    }>;
    revokeTokensBySessionHandle(input: { sessionHandle: string; userContext: UserContext }): Promise<{
        status: "OK";
    }>;
    introspectToken(input: { token: string; scopes?: string[]; userContext: UserContext }): Promise<
        | (InstrospectTokenResponse & {
              status: "OK";
          })
        | ErrorOAuth2
    >;
    endSession(input: {
        params: Record<string, string>;
        session?: SessionContainerInterface;
        shouldTryRefresh: boolean;
        userContext: UserContext;
    }): Promise<
        | {
              redirectTo: string;
          }
        | ErrorOAuth2
    >;
    acceptLogoutRequest(input: { challenge: string; userContext: UserContext }): Promise<
        | {
              redirectTo: string;
          }
        | ErrorOAuth2
    >;
    rejectLogoutRequest(input: { challenge: string; userContext: UserContext }): Promise<{
        status: "OK";
    }>;
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
          }) => Promise<
              | {
                    frontendRedirectTo: string;
                    cookies?: string[];
                }
              | ErrorOAuth2
              | GeneralErrorResponse
          >);
    authGET:
        | undefined
        | ((input: {
              params: any;
              cookie: string | undefined;
              session: SessionContainerInterface | undefined;
              shouldTryRefresh: boolean;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    redirectTo: string;
                    cookies?: string[];
                }
              | ErrorOAuth2
              | GeneralErrorResponse
          >);
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
        | ((input: { loginChallenge: string; options: APIOptions; userContext: UserContext }) => Promise<
              | {
                    status: "OK";
                    info: LoginInfo;
                }
              | ErrorOAuth2
              | GeneralErrorResponse
          >);
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
              } & (
                  | {
                        authorizationHeader: string;
                    }
                  | {
                        clientId: string;
                        clientSecret?: string;
                    }
              )
          ) => Promise<
              | {
                    status: "OK";
                }
              | ErrorOAuth2
          >);
    introspectTokenPOST:
        | undefined
        | ((input: {
              token: string;
              scopes?: string[];
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<InstrospectTokenResponse | GeneralErrorResponse | ErrorOAuth2>);
    endSessionGET:
        | undefined
        | ((input: {
              params: Record<string, string>;
              session?: SessionContainerInterface;
              shouldTryRefresh: boolean;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    redirectTo: string;
                }
              | ErrorOAuth2
              | GeneralErrorResponse
          >);
    endSessionPOST:
        | undefined
        | ((input: {
              params: Record<string, string>;
              session?: SessionContainerInterface;
              shouldTryRefresh: boolean;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    redirectTo: string;
                }
              | ErrorOAuth2
              | GeneralErrorResponse
          >);
    logoutPOST:
        | undefined
        | ((input: {
              logoutChallenge: string;
              options: APIOptions;
              session?: SessionContainerInterface;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    frontendRedirectTo: string;
                }
              | ErrorOAuth2
              | GeneralErrorResponse
          >);
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
