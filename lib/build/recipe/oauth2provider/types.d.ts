// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, JSONObject, JSONValue, NonNullableProperties, UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
import { OAuth2Client } from "./OAuth2Client";
import { User } from "../../user";
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
export declare type TokenInfo = {
    access_token: string;
    expires_in: number;
    id_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
};
export declare type LoginInfo = {
    clientName: string;
    tosUri: string;
    policyUri: string;
    logoUri: string;
    metadata?: Record<string, any> | null;
};
export declare type UserInfo = {
    sub: string;
    email?: string;
    email_verified?: boolean;
    phoneNumber?: string;
    phoneNumber_verified?: boolean;
    [key: string]: JSONValue;
};
export declare type RecipeInterface = {
    authorization(input: {
        params: any;
        cookies: string | undefined;
        session: SessionContainerInterface | undefined;
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
    validateOAuth2AccessToken(input: {
        token: string;
        expectedAudience?: string;
        userContext: UserContext;
    }): Promise<{
        status: "OK";
        payload: JSONObject;
    }>;
    validateOAuth2IdToken(input: {
        token: string;
        expectedAudience?: string;
        userContext: UserContext;
    }): Promise<{
        status: "OK";
        payload: JSONObject;
    }>;
    buildAccessTokenPayload(input: {
        user: User;
        session: SessionContainerInterface;
        scopes: string[];
        defaultPayload: JSONObject;
        userContext: UserContext;
    }): Promise<JSONObject>;
    buildIdTokenPayload(input: {
        user: User;
        session: SessionContainerInterface;
        scopes: string[];
        defaultPayload: JSONObject;
        userContext: UserContext;
    }): Promise<JSONObject>;
    buildUserInfo(input: {
        user: User;
        accessTokenPayload: JSONObject;
        scopes: string[];
        tenantId: string;
        userContext: UserContext;
    }): Promise<JSONObject>;
    revokeToken(input: {
        authorizationHeader?: string;
        token: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
          }
        | GeneralErrorResponse
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
    authGET:
        | undefined
        | ((input: {
              params: any;
              cookie: string | undefined;
              session: SessionContainerInterface | undefined;
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
        | ((input: {
              authorizationHeader?: string;
              token: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                }
              | GeneralErrorResponse
          >);
};
export declare type OAuth2ClientOptions = {
    clientId: string;
    clientSecret: string;
    createdAt: string;
    updatedAt: string;
    clientName: string;
    scope: string;
    redirectUris?: string[] | null;
    allowedCorsOrigins?: string[];
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
    accessTokenStrategy?: "jwt" | "opaque";
    audience?: string[];
    grantTypes?: string[] | null;
    responseTypes?: string[] | null;
    clientUri?: string;
    logoUri?: string;
    policyUri?: string;
    tosUri?: string;
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
export declare type CreateOAuth2ClientInput = Partial<
    Omit<OAuth2ClientOptions, "createdAt" | "updatedAt" | "clientId" | "clientSecret">
>;
export declare type UpdateOAuth2ClientInput = NonNullableProperties<
    Omit<CreateOAuth2ClientInput, "redirectUris" | "grantTypes" | "responseTypes" | "metadata">
> & {
    clientId: string;
    redirectUris?: string[] | null;
    grantTypes?: string[] | null;
    responseTypes?: string[] | null;
    metadata?: Record<string, any> | null;
};
export declare type DeleteOAuth2ClientInput = {
    clientId: string;
};
export declare type PayloadBuilderFunction = (
    user: User,
    scopes: string[],
    userContext: UserContext
) => Promise<JSONObject>;
export declare type UserInfoBuilderFunction = (
    user: User,
    accessTokenPayload: JSONObject,
    scopes: string[],
    tenantId: string,
    userContext: UserContext
) => Promise<JSONObject>;
