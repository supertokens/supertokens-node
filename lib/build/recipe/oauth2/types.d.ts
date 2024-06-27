// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, JSONObject, NonNullableProperties, UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
import { OAuth2Client } from "./OAuth2Client";
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
export declare type ErrorOAuth2 = {
    error: string;
    errorDescription: string;
    errorDebug?: string;
    errorHint?: string;
    statusCode?: number;
};
export declare type ConsentRequest = {
    acr?: string;
    amr?: string[];
    challenge: string;
    client?: OAuth2Client;
    context?: JSONObject;
    loginChallenge?: string;
    loginSessionId?: string;
    oidcContext?: any;
    requestUrl?: string;
    requestedAccessTokenAudience?: string[];
    requestedScope?: string[];
    skip?: boolean;
    subject?: string;
};
export declare type LoginRequest = {
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
export declare type LogoutRequest = {
    challenge: string;
    client: OAuth2Client;
    requestUrl: string;
    rpInitiated: boolean;
    sid: string;
    subject: string;
};
export declare type TokenInfo = {
    accessToken: string;
    expiresIn: number;
    idToken: string;
    refreshToken: string;
    scope: string;
    tokenType: string;
};
export declare type LoginInfo = {
    clientName: string;
    tosUri: string;
    policyUri: string;
    logoUri: string;
    metadata?: Record<string, any> | null;
};
export declare type RecipeInterface = {
    authorization(input: {
        params: any;
        cookies: string | undefined;
        userContext: UserContext;
    }): Promise<{
        redirectTo: string;
        setCookie: string | undefined;
    }>;
    token(input: { body: any; userContext: UserContext }): Promise<TokenInfo | ErrorOAuth2 | GeneralErrorResponse>;
    getConsentRequest(input: { challenge: string; userContext: UserContext }): Promise<ConsentRequest>;
    acceptConsentRequest(input: {
        challenge: string;
        context?: any;
        grantAccessTokenAudience?: string[];
        grantScope?: string[];
        handledAt?: string[];
        remember?: boolean;
        rememberFor?: number;
        session?: any;
        userContext: UserContext;
    }): Promise<{
        redirectTo: string;
    }>;
    rejectConsentRequest(input: {
        challenge: string;
        error: ErrorOAuth2;
        userContext: UserContext;
    }): Promise<{
        redirectTo: string;
    }>;
    getLoginRequest(input: { challenge: string; userContext: UserContext }): Promise<LoginRequest>;
    acceptLoginRequest(input: {
        challenge: string;
        acr?: string;
        amr?: string[];
        context?: any;
        extendSessionLifespan?: boolean;
        forceSubjectIdentifier?: string;
        identityProviderSessionId?: string;
        remember?: boolean;
        rememberFor?: number;
        subject: string;
        userContext: UserContext;
    }): Promise<{
        redirectTo: string;
    }>;
    rejectLoginRequest(input: {
        challenge: string;
        error: ErrorOAuth2;
        userContext: UserContext;
    }): Promise<{
        redirectTo: string;
    }>;
    getLogoutRequest(input: { challenge: string; userContext: UserContext }): Promise<LogoutRequest>;
    acceptLogoutRequest(input: {
        challenge: string;
        userContext: UserContext;
    }): Promise<{
        redirectTo: string;
    }>;
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
        | {
              status: "ERROR";
              error: string;
              errorHint: string;
          }
    >;
};
export declare type APIInterface = {
    loginGET:
        | undefined
        | ((input: {
              loginChallenge: string;
              options: APIOptions;
              session?: SessionContainerInterface;
              userContext: UserContext;
          }) => Promise<
              | {
                    redirectTo: string;
                }
              | GeneralErrorResponse
          >);
    loginPOST:
        | undefined
        | ((input: {
              loginChallenge: string;
              accept: boolean;
              session: SessionContainerInterface;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    redirectTo: string;
                }
              | GeneralErrorResponse
          >);
    logoutGET:
        | undefined
        | ((input: {
              logoutChallenge: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    redirectTo: string;
                }
              | GeneralErrorResponse
          >);
    logoutPOST:
        | undefined
        | ((input: {
              logoutChallenge: string;
              accept: boolean;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    redirectTo: string;
                }
              | GeneralErrorResponse
          >);
    consentGET:
        | undefined
        | ((input: {
              consentChallenge: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    redirectTo: string;
                }
              | GeneralErrorResponse
          >);
    consentPOST:
        | undefined
        | ((input: {
              consentChallenge: string;
              accept: boolean;
              grantScope: string[];
              remember: boolean;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    redirectTo: string;
                }
              | GeneralErrorResponse
          >);
    authGET:
        | undefined
        | ((input: {
              params: any;
              cookie: string | undefined;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    redirectTo: string;
                    setCookie: string | undefined;
                }
              | ErrorOAuth2
              | GeneralErrorResponse
          >);
    tokenPOST:
        | undefined
        | ((input: {
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
          }) => Promise<
              | {
                    status: "OK";
                    info: LoginInfo;
                }
              | GeneralErrorResponse
          >);
};
export declare type OAuth2ClientOptions = {
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
export declare type GetOAuth2ClientsInput = {
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
export declare type CreateOAuth2ClientInput = Partial<Omit<OAuth2ClientOptions, "createdAt" | "updatedAt">>;
export declare type UpdateOAuth2ClientInput = NonNullableProperties<
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
export declare type DeleteOAuth2ClientInput = {
    clientId: string;
};
