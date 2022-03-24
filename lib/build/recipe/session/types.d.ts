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
        claims: SessionClaimPayloadType;
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
        onMissingClaim: {
            type: string;
        };
    };
    additionalProperties: boolean;
};
export interface ErrorHandlers {
    onUnauthorised?: ErrorHandlerMiddleware;
    onTokenTheftDetected?: TokenTheftErrorHandlerMiddleware;
    onMissingClaim: ErrorHandlerMiddleware;
}
export declare type TypeInput = {
    cookieSecure?: boolean;
    cookieSameSite?: "strict" | "lax" | "none";
    sessionExpiredStatusCode?: number;
    cookieDomain?: string;
    errorHandlers?: ErrorHandlers;
    antiCsrf?: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    defaultRequiredClaims?: SessionClaim<any>[];
    missingClaimStatusCode?: number;
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
                onMissingClaim: {
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
    defaultRequiredClaims: SessionClaim<any>[];
    missingClaimStatusCode: number;
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
export interface MissingClaimErrorHandlerMiddleware {
    (claimId: string, request: BaseRequest, response: BaseResponse): Promise<void>;
}
export interface NormalisedErrorHandlers {
    onUnauthorised: ErrorHandlerMiddleware;
    onTryRefreshToken: ErrorHandlerMiddleware;
    onTokenTheftDetected: TokenTheftErrorHandlerMiddleware;
    onMissingClaim: MissingClaimErrorHandlerMiddleware;
}
export interface VerifySessionOptions {
    antiCsrfCheck?: boolean;
    sessionRequired?: boolean;
    requiredClaims?: SessionClaim<any>[];
}
export declare type RecipeInterface = {
    createNewSession(input: {
        res: any;
        userId: string;
        accessTokenPayload?: any;
        sessionData?: any;
        claimsToAdd?: SessionClaim<any>[];
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
    updateSessionClaims(input: {
        sessionHandle: string;
        claims: SessionClaimPayloadType;
        userContext: any;
    }): Promise<void>;
    updateAccessTokenPayload(input: {
        sessionHandle: string;
        newAccessTokenPayload: any;
        userContext: any;
    }): Promise<void>;
    regenerateAccessToken(input: {
        accessToken: string;
        newAccessTokenPayload?: any;
        newClaimPayload?: SessionClaimPayloadType;
        userContext: any;
    }): Promise<{
        status: "OK";
        session: {
            handle: string;
            userId: string;
            userDataInJWT: any;
            claims: SessionClaimPayloadType;
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
    getSessionClaimPayload(userContext?: any): SessionClaimPayloadType;
    getHandle(userContext?: any): string;
    getAccessToken(userContext?: any): string;
    regenerateToken(
        newAccessTokenPayload: any | undefined,
        newClaimPayload: SessionClaimPayloadType | undefined,
        userContext: any
    ): Promise<void>;
    updateAccessTokenPayload(newAccessTokenPayload: any, userContext?: any): Promise<void>;
    getTimeCreated(userContext?: any): Promise<number>;
    getExpiry(userContext?: any): Promise<number>;
    updateClaim(claim: SessionClaim<any>, userContext?: any): Promise<void>;
    updateClaims(claims: SessionClaim<any>[], userContext?: any): Promise<void>;
    checkClaimInToken(claim: SessionClaim<any>, userContext?: any): Awaitable<boolean>;
    addClaim<T>(claim: SessionClaim<T>, value: T, userContext?: any): Promise<void>;
    removeClaim<T>(claim: SessionClaim<T>, userContext?: any): Promise<void>;
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
    claims: SessionClaimPayloadType;
    expiry: number;
    accessTokenPayload: any;
    timeCreated: number;
};
export declare type SessionClaimPayloadType = Record<string, JSONObject>;
export declare abstract class SessionClaim<T> {
    readonly id: string;
    constructor(id: string);
    /**
     * This methods fetches the current value of this claim for the user.
     * The undefined return value signifies that we don't want to update the claim payload and or the claim value is not present in the database
     * This can happen for example with a second factor auth claim, where we don't want to add the claim to the session automatically.
     */
    abstract fetch(userId: string, userContext: any): Awaitable<T | undefined>;
    /**
     * Decides if we need to refetch the claim value before checking the payload with `isValid`.
     * E.g.: if the information in the payload is expired, or is not sufficient for this check.
     */
    abstract shouldRefetch(payload: SessionClaimPayloadType, userContext: any): Awaitable<boolean>;
    /**
     * Decides if the claim is valid based on the payload (and not checking DB or anything else)
     */
    abstract isValid(payload: SessionClaimPayloadType, userContext: any): Awaitable<boolean>;
    /**
     * Saves the provided value into the payload, by cloning and updating the entire object.
     *
     * @returns The modified payload object
     */
    abstract addToPayload(payload: SessionClaimPayloadType, value: T, userContext: any): SessionClaimPayloadType;
    /**
     * Removes the claim from the payload, by cloning and updating the entire object.
     *
     * @returns The modified payload object
     */
    abstract removeFromPayload(payload: SessionClaimPayloadType, userContext: any): SessionClaimPayloadType;
    /**
     * Updates the access token with the provided value, by cloning and updating the entire access token payload object.
     *
     * @returns The modified payload object
     */
    abstract updateAccessTokenPayload?(payload: JSONObject, value: T | undefined, userContext: any): JSONObject;
}
