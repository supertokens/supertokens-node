// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import { RecipeInterface as JWTRecipeInterface, APIInterface as JWTAPIInterface } from "../jwt/types";
import OverrideableBuilder from "supertokens-js-override";
import { RecipeInterface as OpenIdRecipeInterface, APIInterface as OpenIdAPIInterface } from "../openid/types";
import { JSONObject, JSONValue } from "../../types";
import { GeneralErrorResponse } from "../../types";
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
export interface ErrorHandlers {
    onUnauthorised?: ErrorHandlerMiddleware;
    onTokenTheftDetected?: TokenTheftErrorHandlerMiddleware;
    onInvalidClaim?: InvalidClaimErrorHandlerMiddleware;
}
export declare type TypeInput = {
    cookieSecure?: boolean;
    cookieSameSite?: "strict" | "lax" | "none";
    sessionExpiredStatusCode?: number;
    cookieDomain?: string;
    errorHandlers?: ErrorHandlers;
    antiCsrf?: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    invalidClaimStatusCode?: number;
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
export declare type TypeNormalisedInput = {
    refreshTokenPath: NormalisedURLPath;
    cookieDomain: string | undefined;
    cookieSameSite: "strict" | "lax" | "none";
    cookieSecure: boolean;
    sessionExpiredStatusCode: number;
    errorHandlers: NormalisedErrorHandlers;
    antiCsrf: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    invalidClaimStatusCode: number;
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
export interface InvalidClaimErrorHandlerMiddleware {
    (validatorErrors: ClaimValidationError[], request: BaseRequest, response: BaseResponse): Promise<void>;
}
export interface NormalisedErrorHandlers {
    onUnauthorised: ErrorHandlerMiddleware;
    onTryRefreshToken: ErrorHandlerMiddleware;
    onTokenTheftDetected: TokenTheftErrorHandlerMiddleware;
    onInvalidClaim: InvalidClaimErrorHandlerMiddleware;
}
export interface VerifySessionOptions {
    antiCsrfCheck?: boolean;
    sessionRequired?: boolean;
    overrideGlobalClaimValidators?: (
        globalClaimValidators: SessionClaimValidator[],
        session: SessionContainerInterface,
        userContext: any
    ) => Promise<SessionClaimValidator[]> | SessionClaimValidator[];
}
export declare type RecipeInterface = {
    createNewSession(input: {
        res: BaseResponse;
        userId: string;
        accessTokenPayload?: any;
        sessionData?: any;
        userContext: any;
    }): Promise<SessionContainerInterface>;
    getGlobalClaimValidators(input: {
        userId: string;
        claimValidatorsAddedByOtherRecipes: SessionClaimValidator[];
        userContext: any;
    }): Promise<SessionClaimValidator[]> | SessionClaimValidator[];
    getSession(input: {
        req: BaseRequest;
        res: BaseResponse;
        options?: VerifySessionOptions;
        userContext: any;
    }): Promise<SessionContainerInterface | undefined>;
    refreshSession(input: {
        req: BaseRequest;
        res: BaseResponse;
        userContext: any;
    }): Promise<SessionContainerInterface>;
    /**
     * Used to retrieve all session information for a given session handle. Can be used in place of:
     * - getSessionData
     * - getAccessTokenPayload
     *
     * Returns undefined if the sessionHandle does not exist
     */
    getSessionInformation(input: { sessionHandle: string; userContext: any }): Promise<SessionInformation | undefined>;
    revokeAllSessionsForUser(input: { userId: string; userContext: any }): Promise<string[]>;
    getAllSessionHandlesForUser(input: { userId: string; userContext: any }): Promise<string[]>;
    revokeSession(input: { sessionHandle: string; userContext: any }): Promise<boolean>;
    revokeMultipleSessions(input: { sessionHandles: string[]; userContext: any }): Promise<string[]>;
    updateSessionData(input: { sessionHandle: string; newSessionData: any; userContext: any }): Promise<boolean>;
    /**
     * @deprecated Use mergeIntoAccessTokenPayload instead
     * @returns {Promise<boolean>} Returns false if the sessionHandle does not exist
     */
    updateAccessTokenPayload(input: {
        sessionHandle: string;
        newAccessTokenPayload: any;
        userContext: any;
    }): Promise<boolean>;
    mergeIntoAccessTokenPayload(input: {
        sessionHandle: string;
        accessTokenPayloadUpdate: JSONObject;
        userContext: any;
    }): Promise<boolean>;
    /**
     * @returns {Promise<boolean>} Returns false if the sessionHandle does not exist
     */
    regenerateAccessToken(input: {
        accessToken: string;
        newAccessTokenPayload?: any;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              session: {
                  handle: string;
                  userId: string;
                  userDataInJWT: any;
              };
              accessToken?: {
                  token: string;
                  expiry: number;
                  createdTime: number;
              };
          }
        | undefined
    >;
    getAccessTokenLifeTimeMS(input: { userContext: any }): Promise<number>;
    getRefreshTokenLifeTimeMS(input: { userContext: any }): Promise<number>;
    validateClaims(input: {
        userId: string;
        accessTokenPayload: any;
        claimValidators: SessionClaimValidator[];
        userContext: any;
    }): Promise<{
        invalidClaims: ClaimValidationError[];
        accessTokenPayloadUpdate?: any;
    }>;
    validateClaimsInJWTPayload(input: {
        userId: string;
        jwtPayload: JSONObject;
        claimValidators: SessionClaimValidator[];
        userContext: any;
    }): Promise<{
        status: "OK";
        invalidClaims: ClaimValidationError[];
    }>;
    fetchAndSetClaim(input: { sessionHandle: string; claim: SessionClaim<any>; userContext: any }): Promise<boolean>;
    setClaimValue<T>(input: {
        sessionHandle: string;
        claim: SessionClaim<T>;
        value: T;
        userContext: any;
    }): Promise<boolean>;
    getClaimValue<T>(input: {
        sessionHandle: string;
        claim: SessionClaim<T>;
        userContext: any;
    }): Promise<
        | {
              status: "SESSION_DOES_NOT_EXIST_ERROR";
          }
        | {
              status: "OK";
              value: T | undefined;
          }
    >;
    removeClaim(input: { sessionHandle: string; claim: SessionClaim<any>; userContext: any }): Promise<boolean>;
};
export interface SessionContainerInterface {
    revokeSession(userContext?: any): Promise<void>;
    getSessionData(userContext?: any): Promise<any>;
    updateSessionData(newSessionData: any, userContext?: any): Promise<any>;
    getUserId(userContext?: any): string;
    getAccessTokenPayload(userContext?: any): any;
    getHandle(userContext?: any): string;
    getAccessToken(userContext?: any): string;
    /**
     * @deprecated Use mergeIntoAccessTokenPayload instead
     */
    updateAccessTokenPayload(newAccessTokenPayload: any, userContext?: any): Promise<void>;
    mergeIntoAccessTokenPayload(accessTokenPayloadUpdate: JSONObject, userContext?: any): Promise<void>;
    getTimeCreated(userContext?: any): Promise<number>;
    getExpiry(userContext?: any): Promise<number>;
    assertClaims(claimValidators: SessionClaimValidator[], userContext?: any): Promise<void>;
    fetchAndSetClaim<T>(claim: SessionClaim<T>, userContext?: any): Promise<void>;
    setClaimValue<T>(claim: SessionClaim<T>, value: T, userContext?: any): Promise<void>;
    getClaimValue<T>(claim: SessionClaim<T>, userContext?: any): Promise<T | undefined>;
    removeClaim(claim: SessionClaim<any>, userContext?: any): Promise<void>;
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
    /**
     * We do not add a GeneralErrorResponse response to this API
     * since it's not something that is directly called by the user on the
     * frontend anyway
     */
    refreshPOST: undefined | ((input: { options: APIOptions; userContext: any }) => Promise<SessionContainerInterface>);
    signOutPOST:
        | undefined
        | ((input: {
              options: APIOptions;
              session: SessionContainerInterface | undefined;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                }
              | GeneralErrorResponse
          >);
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
    expiry: number;
    accessTokenPayload: any;
    timeCreated: number;
};
export declare type ClaimValidationResult =
    | {
          isValid: true;
      }
    | {
          isValid: false;
          reason?: JSONValue;
      };
export declare type ClaimValidationError = {
    id: string;
    reason?: JSONValue;
};
export declare type SessionClaimValidator = (
    | // We split the type like this to express that either both claim and shouldRefetch is defined or neither.
    {
          claim: SessionClaim<any>;
          /**
           * Decides if we need to refetch the claim value before checking the payload with `isValid`.
           * E.g.: if the information in the payload is expired, or is not sufficient for this check.
           */
          shouldRefetch: (payload: any, userContext: any) => Promise<boolean> | boolean;
      }
    | {}
) & {
    id: string;
    /**
     * Decides if the claim is valid based on the payload (and not checking DB or anything else)
     */
    validate: (payload: any, userContext: any) => Promise<ClaimValidationResult>;
};
export declare abstract class SessionClaim<T> {
    readonly key: string;
    constructor(key: string);
    /**
     * This methods fetches the current value of this claim for the user.
     * The undefined return value signifies that we don't want to update the claim payload and or the claim value is not present in the database
     * This can happen for example with a second factor auth claim, where we don't want to add the claim to the session automatically.
     */
    abstract fetchValue(userId: string, userContext: any): Promise<T | undefined> | T | undefined;
    /**
     * Saves the provided value into the payload, by cloning and updating the entire object.
     *
     * @returns The modified payload object
     */
    abstract addToPayload_internal(payload: JSONObject, value: T, userContext: any): JSONObject;
    /**
     * Removes the claim from the payload by setting it to null, so mergeIntoAccessTokenPayload clears it
     *
     * @returns The modified payload object
     */
    abstract removeFromPayloadByMerge_internal(payload: JSONObject, userContext?: any): JSONObject;
    /**
     * Removes the claim from the payload, by cloning and updating the entire object.
     *
     * @returns The modified payload object
     */
    abstract removeFromPayload(payload: JSONObject, userContext?: any): JSONObject;
    /**
     * Gets the value of the claim stored in the payload
     *
     * @returns Claim value
     */
    abstract getValueFromPayload(payload: JSONObject, userContext: any): T | undefined;
    build(userId: string, userContext?: any): Promise<JSONObject>;
}
