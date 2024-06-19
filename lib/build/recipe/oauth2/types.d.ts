// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { Nullable, UserContext } from "../../types";
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
export declare type RecipeInterface = {
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
export declare type APIInterface = {};
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
    tokenEndpointAuthSigningAlg?: string | null;
    accessTokenStrategy?: "jwt" | "opaque" | null;
    backchannelLogoutSessionRequired?: boolean;
    backchannelLogoutUri?: string | null;
    frontchannelLogoutSessionRequired?: boolean;
    frontchannelLogoutUri?: string | null;
    requestObjectSigningAlg?: string | null;
    sectorIdentifierUri?: string | null;
    userinfoSignedResponseAlg?: string | null;
    jwks?: Record<any, any>;
    jwksUri?: string | null;
    owner?: string;
    clientUri?: string;
    allowedCorsOrigins?: string[];
    audience?: string[];
    grantTypes?: string[] | null;
    postLogoutRedirectUris?: string[] | null;
    requestUris?: string[] | null;
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
export declare type CreateOAuth2ClientInput = Partial<Omit<OAuth2ClientOptions, "createdAt" | "updatedAt">>;
export declare type UpdateOAuth2ClientInput = Nullable<CreateOAuth2ClientInput>;
export declare type DeleteOAuth2ClientInput = {
    clientId: string;
};
