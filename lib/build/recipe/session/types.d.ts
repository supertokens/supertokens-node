// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import OverrideableBuilder from "supertokens-js-override";
import { JSONObject, JSONValue, UserContext } from "../../types";
import { GeneralErrorResponse } from "../../types";
import RecipeUserId from "../../recipeUserId";
export type KeyInfo = {
    publicKey: string;
    expiryTime: number;
    createdAt: number;
};
export type AntiCsrfType = "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
export type TokenInfo = {
    token: string;
    expiry: number;
    createdTime: number;
};
export type CreateOrRefreshAPIResponse = {
    session: {
        handle: string;
        userId: string;
        recipeUserId: RecipeUserId;
        userDataInJWT: any;
        tenantId: string;
    };
    accessToken: TokenInfo;
    refreshToken: TokenInfo;
    antiCsrfToken: string | undefined;
};
export interface ErrorHandlers {
    onUnauthorised?: ErrorHandlerMiddleware;
    onTryRefreshToken?: ErrorHandlerMiddleware;
    onTokenTheftDetected?: TokenTheftErrorHandlerMiddleware;
    onInvalidClaim?: InvalidClaimErrorHandlerMiddleware;
    onClearDuplicateSessionCookies?: ErrorHandlerMiddleware;
}
export type TokenType = "access" | "refresh";
export type TokenTransferMethod = "header" | "cookie";
export type TypeInput = {
    useDynamicAccessTokenSigningKey?: boolean;
    sessionExpiredStatusCode?: number;
    invalidClaimStatusCode?: number;
    accessTokenPath?: string;
    cookieSecure?: boolean;
    cookieSameSite?: "strict" | "lax" | "none";
    cookieDomain?: string;
    olderCookieDomain?: string;
    getTokenTransferMethod?: (input: {
        req: BaseRequest;
        forCreateNewSession: boolean;
        userContext: UserContext;
    }) => TokenTransferMethod | "any";
    getCookieNameForTokenType?: (req: BaseRequest, tokenType: TokenType, userContext: UserContext) => string;
    getResponseHeaderNameForTokenType?: (req: BaseRequest, tokenType: TokenType, userContext: UserContext) => string;
    errorHandlers?: ErrorHandlers;
    antiCsrf?: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    exposeAccessTokenToFrontendInCookieBasedAuth?: boolean;
    jwksRefreshIntervalSec?: number;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type TypeNormalisedInput = {
    useDynamicAccessTokenSigningKey: boolean;
    refreshTokenPath: NormalisedURLPath;
    accessTokenPath: NormalisedURLPath;
    cookieDomain: string | undefined;
    olderCookieDomain: string | undefined;
    getCookieSameSite: (input: {
        request: BaseRequest | undefined;
        userContext: UserContext;
    }) => "strict" | "lax" | "none";
    cookieSecure: boolean;
    getCookieNameForTokenType: (req: BaseRequest, tokenType: TokenType, userContext: UserContext) => string;
    getResponseHeaderNameForTokenType: (req: BaseRequest, tokenType: TokenType, userContext: UserContext) => string;
    sessionExpiredStatusCode: number;
    errorHandlers: NormalisedErrorHandlers;
    antiCsrfFunctionOrString:
        | "VIA_TOKEN"
        | "VIA_CUSTOM_HEADER"
        | "NONE"
        | ((input: { request: BaseRequest | undefined; userContext: UserContext }) => "VIA_CUSTOM_HEADER" | "NONE");
    getTokenTransferMethod: (input: {
        req: BaseRequest;
        forCreateNewSession: boolean;
        userContext: UserContext;
    }) => TokenTransferMethod | "any";
    invalidClaimStatusCode: number;
    exposeAccessTokenToFrontendInCookieBasedAuth: boolean;
    jwksRefreshIntervalSec: number;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export interface SessionRequest extends BaseRequest {
    session?: SessionContainerInterface;
}
export interface ErrorHandlerMiddleware {
    (message: string, request: BaseRequest, response: BaseResponse, userContext: UserContext): Promise<void>;
}
export interface TokenTheftErrorHandlerMiddleware {
    (
        sessionHandle: string,
        userId: string,
        recipeUserId: RecipeUserId,
        request: BaseRequest,
        response: BaseResponse,
        userContext: UserContext
    ): Promise<void>;
}
export interface InvalidClaimErrorHandlerMiddleware {
    (
        validatorErrors: ClaimValidationError[],
        request: BaseRequest,
        response: BaseResponse,
        userContext: UserContext
    ): Promise<void>;
}
export interface NormalisedErrorHandlers {
    onUnauthorised: ErrorHandlerMiddleware;
    onTryRefreshToken: ErrorHandlerMiddleware;
    onTokenTheftDetected: TokenTheftErrorHandlerMiddleware;
    onInvalidClaim: InvalidClaimErrorHandlerMiddleware;
    onClearDuplicateSessionCookies: ErrorHandlerMiddleware;
}
export interface VerifySessionOptions {
    antiCsrfCheck?: boolean;
    sessionRequired?: boolean;
    checkDatabase?: boolean;
    overrideGlobalClaimValidators?: (
        globalClaimValidators: SessionClaimValidator[],
        session: SessionContainerInterface,
        userContext: UserContext
    ) => Promise<SessionClaimValidator[]> | SessionClaimValidator[];
}
export type RecipeInterface = {
    createNewSession(input: {
        userId: string;
        recipeUserId: RecipeUserId;
        accessTokenPayload?: any;
        sessionDataInDatabase?: any;
        disableAntiCsrf?: boolean;
        tenantId: string;
        userContext: UserContext;
    }): Promise<SessionContainerInterface>;
    getGlobalClaimValidators(input: {
        tenantId: string;
        userId: string;
        recipeUserId: RecipeUserId;
        claimValidatorsAddedByOtherRecipes: SessionClaimValidator[];
        userContext: UserContext;
    }): Promise<SessionClaimValidator[]> | SessionClaimValidator[];
    getSession(input: {
        accessToken: string | undefined;
        antiCsrfToken?: string;
        options?: VerifySessionOptions;
        userContext: UserContext;
    }): Promise<SessionContainerInterface | undefined>;
    refreshSession(input: {
        refreshToken: string;
        antiCsrfToken?: string;
        disableAntiCsrf: boolean;
        userContext: UserContext;
    }): Promise<SessionContainerInterface>;
    /**
     * Used to retrieve all session information for a given session handle. Can be used in place of:
     * - getSessionDataFromDatabase
     * - getAccessTokenPayload
     *
     * Returns undefined if the sessionHandle does not exist
     */
    getSessionInformation(input: {
        sessionHandle: string;
        userContext: UserContext;
    }): Promise<SessionInformation | undefined>;
    revokeAllSessionsForUser(input: {
        userId: string;
        revokeSessionsForLinkedAccounts: boolean;
        tenantId: string;
        revokeAcrossAllTenants?: boolean;
        userContext: UserContext;
    }): Promise<string[]>;
    getAllSessionHandlesForUser(input: {
        userId: string;
        fetchSessionsForAllLinkedAccounts: boolean;
        tenantId: string;
        fetchAcrossAllTenants?: boolean;
        userContext: UserContext;
    }): Promise<string[]>;
    revokeSession(input: { sessionHandle: string; userContext: UserContext }): Promise<boolean>;
    revokeMultipleSessions(input: { sessionHandles: string[]; userContext: UserContext }): Promise<string[]>;
    updateSessionDataInDatabase(input: {
        sessionHandle: string;
        newSessionData: any;
        userContext: UserContext;
    }): Promise<boolean>;
    mergeIntoAccessTokenPayload(input: {
        sessionHandle: string;
        accessTokenPayloadUpdate: JSONObject;
        userContext: UserContext;
    }): Promise<boolean>;
    /**
     * @returns {Promise<boolean>} Returns false if the sessionHandle does not exist
     */
    regenerateAccessToken(input: {
        accessToken: string;
        newAccessTokenPayload?: any;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              session: {
                  handle: string;
                  userId: string;
                  recipeUserId: RecipeUserId;
                  userDataInJWT: any;
                  tenantId: string;
              };
              accessToken?: {
                  token: string;
                  expiry: number;
                  createdTime: number;
              };
          }
        | undefined
    >;
    validateClaims(input: {
        userId: string;
        recipeUserId: RecipeUserId;
        accessTokenPayload: any;
        claimValidators: SessionClaimValidator[];
        userContext: UserContext;
    }): Promise<{
        invalidClaims: ClaimValidationError[];
        accessTokenPayloadUpdate?: any;
    }>;
    fetchAndSetClaim(input: {
        sessionHandle: string;
        claim: SessionClaim<any>;
        userContext: UserContext;
    }): Promise<boolean>;
    setClaimValue<T>(input: {
        sessionHandle: string;
        claim: SessionClaim<T>;
        value: T;
        userContext: UserContext;
    }): Promise<boolean>;
    getClaimValue<T>(input: { sessionHandle: string; claim: SessionClaim<T>; userContext: UserContext }): Promise<
        | {
              status: "SESSION_DOES_NOT_EXIST_ERROR";
          }
        | {
              status: "OK";
              value: T | undefined;
          }
    >;
    removeClaim(input: { sessionHandle: string; claim: SessionClaim<any>; userContext: UserContext }): Promise<boolean>;
};
export interface SessionContainerInterface {
    revokeSession(userContext?: Record<string, any>): Promise<void>;
    getSessionDataFromDatabase(userContext?: Record<string, any>): Promise<any>;
    updateSessionDataInDatabase(newSessionData: any, userContext?: Record<string, any>): Promise<any>;
    getUserId(userContext?: Record<string, any>): string;
    getRecipeUserId(userContext?: Record<string, any>): RecipeUserId;
    getTenantId(userContext?: Record<string, any>): string;
    getAccessTokenPayload(userContext?: Record<string, any>): any;
    getHandle(userContext?: Record<string, any>): string;
    getAllSessionTokensDangerously(): {
        accessToken: string;
        refreshToken: string | undefined;
        antiCsrfToken: string | undefined;
        frontToken: string;
        accessAndFrontTokenUpdated: boolean;
    };
    getAccessToken(userContext?: Record<string, any>): string;
    mergeIntoAccessTokenPayload(accessTokenPayloadUpdate: JSONObject, userContext?: Record<string, any>): Promise<void>;
    getTimeCreated(userContext?: Record<string, any>): Promise<number>;
    getExpiry(userContext?: Record<string, any>): Promise<number>;
    assertClaims(claimValidators: SessionClaimValidator[], userContext?: Record<string, any>): Promise<void>;
    fetchAndSetClaim<T>(claim: SessionClaim<T>, userContext?: Record<string, any>): Promise<void>;
    setClaimValue<T>(claim: SessionClaim<T>, value: T, userContext?: Record<string, any>): Promise<void>;
    getClaimValue<T>(claim: SessionClaim<T>, userContext?: Record<string, any>): Promise<T | undefined>;
    removeClaim(claim: SessionClaim<any>, userContext?: Record<string, any>): Promise<void>;
    attachToRequestResponse(reqResInfo: ReqResInfo, userContext?: Record<string, any>): Promise<void> | void;
}
export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export type APIInterface = {
    /**
     * We do not add a GeneralErrorResponse response to this API
     * since it's not something that is directly called by the user on the
     * frontend anyway
     */
    refreshPOST:
        | undefined
        | ((input: { options: APIOptions; userContext: UserContext }) => Promise<SessionContainerInterface>);
    signOutPOST:
        | undefined
        | ((input: { options: APIOptions; session: SessionContainerInterface; userContext: UserContext }) => Promise<
              | {
                    status: "OK";
                }
              | GeneralErrorResponse
          >);
    verifySession(input: {
        verifySessionOptions: VerifySessionOptions | undefined;
        options: APIOptions;
        userContext: UserContext;
    }): Promise<SessionContainerInterface | undefined>;
};
export type SessionInformation = {
    sessionHandle: string;
    userId: string;
    recipeUserId: RecipeUserId;
    sessionDataInDatabase: any;
    expiry: number;
    customClaimsInAccessTokenPayload: any;
    timeCreated: number;
    tenantId: string;
};
export type ClaimValidationResult =
    | {
          isValid: true;
      }
    | {
          isValid: false;
          reason?: JSONValue;
      };
export type ClaimValidationError = {
    id: string;
    reason?: JSONValue;
};
export type SessionClaimValidator = (
    | // We split the type like this to express that either both claim and shouldRefetch is defined or neither.
    {
          claim: SessionClaim<any>;
          /**
           * Decides if we need to refetch the claim value before checking the payload with `isValid`.
           * E.g.: if the information in the payload is expired, or is not sufficient for this check.
           */
          shouldRefetch: (payload: any, userContext: UserContext) => Promise<boolean> | boolean;
      }
    | {}
) & {
    id: string;
    /**
     * Decides if the claim is valid based on the payload (and not checking DB or anything else)
     */
    validate: (payload: any, userContext: UserContext) => Promise<ClaimValidationResult>;
};
export declare abstract class SessionClaim<T> {
    readonly key: string;
    constructor(key: string);
    /**
     * This methods fetches the current value of this claim for the user.
     * The undefined return value signifies that we don't want to update the claim payload and or the claim value is not present in the database
     * This can happen for example with a second factor auth claim, where we don't want to add the claim to the session automatically.
     */
    abstract fetchValue(
        userId: string,
        recipeUserId: RecipeUserId,
        tenantId: string,
        currentPayload: JSONObject | undefined,
        userContext: UserContext
    ): Promise<T | undefined> | T | undefined;
    /**
     * Saves the provided value into the payload, by cloning and updating the entire object.
     *
     * @returns The modified payload object
     */
    abstract addToPayload_internal(payload: JSONObject, value: T, userContext: UserContext): JSONObject;
    /**
     * Removes the claim from the payload by setting it to null, so mergeIntoAccessTokenPayload clears it
     *
     * @returns The modified payload object
     */
    abstract removeFromPayloadByMerge_internal(payload: JSONObject, userContext: UserContext): JSONObject;
    /**
     * Removes the claim from the payload, by cloning and updating the entire object.
     *
     * @returns The modified payload object
     */
    abstract removeFromPayload(payload: JSONObject, userContext: UserContext): JSONObject;
    /**
     * Gets the value of the claim stored in the payload
     *
     * @returns Claim value
     */
    abstract getValueFromPayload(payload: JSONObject, userContext: UserContext): T | undefined;
    build(
        userId: string,
        recipeUserId: RecipeUserId,
        tenantId: string,
        currentPayload: JSONObject | undefined,
        userContext: UserContext
    ): Promise<JSONObject>;
}
export type ReqResInfo = {
    res: BaseResponse;
    req: BaseRequest;
    transferMethod: TokenTransferMethod;
};
