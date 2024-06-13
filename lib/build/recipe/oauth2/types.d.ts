// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, JSONObject, UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
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
export declare type OAuth2Client = {};
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
export declare type RecipeInterface = {
    authorization(input: {
        params: any;
        userContext: UserContext;
    }): Promise<{
        redirectTo: string;
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
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    redirectTo: string;
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
};
