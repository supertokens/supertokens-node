// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import { RecipeInterface as JWTRecipeInterface, APIInterface as JWTAPIInterface } from "../jwt/types";
import OverrideableBuilder from "supertokens-js-override";
import { RecipeInterface as OpenIdRecipeInterface, APIInterface as OpenIdAPIInterface } from "../openid/types";
import { Awaitable, JSONObject } from "../../types";
export declare type KeyInfo = {
    publicKey: string;
    expiryTime: number;
    createdAt: number;
};
export declare type AntiCsrfType = "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
export declare type StoredHandshakeInfo = {
    antiCsrf: AntiCsrfType;
    accessTokenBlacklistingEnabled: boolean;
    accessTokenValidity: number;
    refreshTokenValidity: number;
} & (
    | {
          jwtSigningPublicKeyList: KeyInfo[];
      }
    | {
          jwtSigningPublicKeyList: undefined;
          jwtSigningPublicKey: string;
          jwtSigningPublicKeyExpiryTime: number;
      }
);
export declare type CreateOrRefreshAPIResponse = {
    session: {
        handle: string;
        userId: string;
        userDataInJWT: any;
        grants: GrantPayloadType;
    };
    accessToken: {
        token: string;
        expiry: number;
        createdTime: number;
    };
    refreshToken: {
        token: string;
        expiry: number;
        createdTime: number;
    };
    idRefreshToken: {
        token: string;
        expiry: number;
        createdTime: number;
    };
    antiCsrfToken: string | undefined;
};
export declare const InputSchemaErrorHandlers: {
    type: string;
    properties: {
        onUnauthorised: {
            type: string;
        };
        onTokenTheftDetected: {
            type: string;
        };
        onMissingGrant: {
            type: string;
        };
    };
    additionalProperties: boolean;
};
export interface ErrorHandlers {
    onUnauthorised?: ErrorHandlerMiddleware;
    onTokenTheftDetected?: TokenTheftErrorHandlerMiddleware;
    onMissingGrant: ErrorHandlerMiddleware;
}
export declare type TypeInput = {
    cookieSecure?: boolean;
    cookieSameSite?: "strict" | "lax" | "none";
    sessionExpiredStatusCode?: number;
    cookieDomain?: string;
    errorHandlers?: ErrorHandlers;
    antiCsrf?: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    defaultRequiredGrants?: Grant<any>[];
    missingGrantStatusCode?: number;
    jwt?:
        | {
              enable: true;
              propertyNameInAccessTokenPayload?: string;
              issuer?: string;
          }
        | {
              enable: false;
          };
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
        openIdFeature?: {
            functions?: (
                originalImplementation: OpenIdRecipeInterface,
                builder?: OverrideableBuilder<OpenIdRecipeInterface>
            ) => OpenIdRecipeInterface;
            apis?: (
                originalImplementation: OpenIdAPIInterface,
                builder?: OverrideableBuilder<OpenIdAPIInterface>
            ) => OpenIdAPIInterface;
            jwtFeature?: {
                functions?: (
                    originalImplementation: JWTRecipeInterface,
                    builder?: OverrideableBuilder<JWTRecipeInterface>
                ) => JWTRecipeInterface;
                apis?: (
                    originalImplementation: JWTAPIInterface,
                    builder?: OverrideableBuilder<JWTAPIInterface>
                ) => JWTAPIInterface;
            };
        };
    };
};
export declare const InputSchema: {
    type: string;
    properties: {
        cookieSecure: {
            type: string;
        };
        cookieSameSite: {
            type: string;
        };
        sessionExpiredStatusCode: {
            type: string;
        };
        cookieDomain: {
            type: string;
        };
        errorHandlers: {
            type: string;
            properties: {
                onUnauthorised: {
                    type: string;
                };
                onTokenTheftDetected: {
                    type: string;
                };
                onMissingGrant: {
                    type: string;
                };
            };
            additionalProperties: boolean;
        };
        antiCsrf: {
            type: string;
        };
        jwt: {
            type: string;
        };
        override: {
            type: string;
        };
    };
    additionalProperties: boolean;
};
export declare type TypeNormalisedInput = {
    refreshTokenPath: NormalisedURLPath;
    cookieDomain: string | undefined;
    cookieSameSite: "strict" | "lax" | "none";
    cookieSecure: boolean;
    sessionExpiredStatusCode: number;
    errorHandlers: NormalisedErrorHandlers;
    antiCsrf: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    defaultRequiredGrants: Grant<any>[];
    missingGrantStatusCode: number;
    jwt: {
        enable: boolean;
        propertyNameInAccessTokenPayload: string;
        issuer?: string;
    };
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
        openIdFeature?: {
            functions?: (
                originalImplementation: OpenIdRecipeInterface,
                builder?: OverrideableBuilder<OpenIdRecipeInterface>
            ) => OpenIdRecipeInterface;
            apis?: (
                originalImplementation: OpenIdAPIInterface,
                builder?: OverrideableBuilder<OpenIdAPIInterface>
            ) => OpenIdAPIInterface;
            jwtFeature?: {
                functions?: (
                    originalImplementation: JWTRecipeInterface,
                    builder?: OverrideableBuilder<JWTRecipeInterface>
                ) => JWTRecipeInterface;
                apis?: (
                    originalImplementation: JWTAPIInterface,
                    builder?: OverrideableBuilder<JWTAPIInterface>
                ) => JWTAPIInterface;
            };
        };
    };
};
export interface SessionRequest extends BaseRequest {
    session?: SessionContainerInterface;
}
export interface ErrorHandlerMiddleware {
    (message: string, request: BaseRequest, response: BaseResponse): Promise<void>;
}
export interface TokenTheftErrorHandlerMiddleware {
    (sessionHandle: string, userId: string, request: BaseRequest, response: BaseResponse): Promise<void>;
}
export interface MissingGrantErrorHandlerMiddleware {
    (grantId: string, request: BaseRequest, response: BaseResponse): Promise<void>;
}
export interface NormalisedErrorHandlers {
    onUnauthorised: ErrorHandlerMiddleware;
    onTryRefreshToken: ErrorHandlerMiddleware;
    onTokenTheftDetected: TokenTheftErrorHandlerMiddleware;
    onMissingGrant: MissingGrantErrorHandlerMiddleware;
}
export interface VerifySessionOptions {
    antiCsrfCheck?: boolean;
    sessionRequired?: boolean;
    requiredGrants?: Grant<any>[];
}
export declare type RecipeInterface = {
    createNewSession(input: {
        res: any;
        userId: string;
        accessTokenPayload?: any;
        sessionData?: any;
        grantsToAdd?: Grant<any>[];
        userContext: any;
    }): Promise<SessionContainerInterface>;
    getSession(input: {
        req: any;
        res: any;
        options?: VerifySessionOptions;
        userContext: any;
    }): Promise<SessionContainerInterface | undefined>;
    refreshSession(input: { req: any; res: any; userContext: any }): Promise<SessionContainerInterface>;
    /**
     * Used to retrieve all session information for a given session handle. Can be used in place of:
     * - getSessionData
     * - getAccessTokenPayload
     */
    getSessionInformation(input: { sessionHandle: string; userContext: any }): Promise<SessionInformation>;
    revokeAllSessionsForUser(input: { userId: string; userContext: any }): Promise<string[]>;
    getAllSessionHandlesForUser(input: { userId: string; userContext: any }): Promise<string[]>;
    revokeSession(input: { sessionHandle: string; userContext: any }): Promise<boolean>;
    revokeMultipleSessions(input: { sessionHandles: string[]; userContext: any }): Promise<string[]>;
    updateSessionData(input: { sessionHandle: string; newSessionData: any; userContext: any }): Promise<void>;
    updateSessionGrants(input: { sessionHandle: string; grants: GrantPayloadType; userContext: any }): Promise<void>;
    updateAccessTokenPayload(input: {
        sessionHandle: string;
        newAccessTokenPayload: any;
        userContext: any;
    }): Promise<void>;
    regenerateAccessToken(input: {
        accessToken: string;
        newAccessTokenPayload?: any;
        newGrants?: GrantPayloadType;
        userContext: any;
    }): Promise<{
        status: "OK";
        session: {
            handle: string;
            userId: string;
            userDataInJWT: any;
            grants: GrantPayloadType;
        };
        accessToken?: {
            token: string;
            expiry: number;
            createdTime: number;
        };
    }>;
    getAccessTokenLifeTimeMS(input: { userContext: any }): Promise<number>;
    getRefreshTokenLifeTimeMS(input: { userContext: any }): Promise<number>;
};
export interface SessionContainerInterface {
    revokeSession(userContext?: any): Promise<void>;
    getSessionData(userContext?: any): Promise<any>;
    updateSessionData(newSessionData: any, userContext?: any): Promise<any>;
    getUserId(userContext?: any): string;
    getAccessTokenPayload(userContext?: any): any;
    getSessionGrants(userContext?: any): any;
    getHandle(userContext?: any): string;
    getAccessToken(userContext?: any): string;
    updateAccessTokenPayload(newAccessTokenPayload: any, userContext?: any): Promise<void>;
    updateSessionGrants(newAccessTokenPayload: any, userContext?: any): Promise<void>;
    getTimeCreated(userContext?: any): Promise<number>;
    getExpiry(userContext?: any): Promise<number>;
    shouldRefetchGrant(grant: Grant<any>, userContext?: any): Awaitable<boolean>;
    fetchGrant(grant: Grant<any>, userContext?: any): Awaitable<void>;
    checkGrantInToken(grant: Grant<any>, userContext?: any): Awaitable<boolean>;
    addGrant<T>(grant: Grant<T>, value: T, userContext?: any): Promise<void>;
    removeGrant<T>(grant: Grant<T>, userContext?: any): Promise<void>;
}
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export declare type APIInterface = {
    refreshPOST: undefined | ((input: { options: APIOptions; userContext: any }) => Promise<void>);
    signOutPOST:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: any;
          }) => Promise<{
              status: "OK";
          }>);
    verifySession(input: {
        verifySessionOptions: VerifySessionOptions | undefined;
        options: APIOptions;
        userContext: any;
    }): Promise<SessionContainerInterface | undefined>;
};
export declare type SessionInformation = {
    sessionHandle: string;
    userId: string;
    sessionData: any;
    grants: GrantPayloadType;
    expiry: number;
    accessTokenPayload: any;
    timeCreated: number;
};
export declare type GrantPayloadType = Record<string, JSONObject>;
export declare abstract class Grant<T> {
    readonly id: string;
    constructor(id: string);
    /**
     * This methods fetches the current value of this grant for an arbitrary session of the user based on a DB or whatever outside source.
     * The undefined return value signifies that we don't want to update the grant payload. This can happen for example with MFA where
     * we don't want to add the grant to the session
     */
    abstract fetchGrant(userId: string, userContext: any): Awaitable<T | undefined>;
    /**
     * Decides if we need to refetch the grant value before checking the payload with `isGrantValid`.
     * E.g.: if the information in the payload is expired, or is not sufficient for this check.
     */
    abstract shouldRefetchGrant(grantPayload: any, userContext: any): Awaitable<boolean>;
    /**
     * Decides if the grant is valid based on the grant payload (and not checking DB or anything else)
     */
    abstract isGrantValid(grantPayload: any, userContext: any): Awaitable<boolean>;
    /**
     * Saves the provided value into the grantPayload, by cloning and updating the payload object.
     *
     * @returns The modified payload object
     */
    abstract addToGrantPayload(grantPayload: GrantPayloadType, value: T, userContext: any): GrantPayloadType;
    /**
     * Saves the provided value into the grantPayload, by cloning and updating the payload object.
     *
     * @returns The modified payload object
     */
    abstract updateAccessTokenPayload?(grantPayload: GrantPayloadType, value: T, userContext: any): GrantPayloadType;
    /**
     * Removes the grant from the grantPayload, by cloning and updating the payload object.
     *
     * @returns The modified payload object
     */
    abstract removeFromGrantPayload(grantPayload: GrantPayloadType, userContext: any): GrantPayloadType;
}
