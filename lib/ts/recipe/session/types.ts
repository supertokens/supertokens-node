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
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import { RecipeInterface as JWTRecipeInterface, APIInterface as JWTAPIInterface } from "../jwt/types";
import OverrideableBuilder from "supertokens-js-override";
import { RecipeInterface as OpenIdRecipeInterface, APIInterface as OpenIdAPIInterface } from "../openid/types";
import { Awaitable } from "../../types";

export type KeyInfo = {
    publicKey: string;
    expiryTime: number;
    createdAt: number;
};

export type AntiCsrfType = "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
export type StoredHandshakeInfo = {
    antiCsrf: AntiCsrfType;
    accessTokenBlacklistingEnabled: boolean;
    accessTokenValidity: number;
    refreshTokenValidity: number;
} & (
    | {
          // Stored after 2.9
          jwtSigningPublicKeyList: KeyInfo[];
      }
    | {
          // Stored before 2.9
          jwtSigningPublicKeyList: undefined;
          jwtSigningPublicKey: string;
          jwtSigningPublicKeyExpiryTime: number;
      }
);

export type CreateOrRefreshAPIResponse = {
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

const TypeString = {
    type: "string",
};

const TypeBoolean = {
    type: "boolean",
};

const TypeNumber = {
    type: "number",
};

const TypeAny = {
    type: "any",
};

export const InputSchemaErrorHandlers = {
    type: "object",
    properties: {
        onUnauthorised: TypeAny,
        onTokenTheftDetected: TypeAny,
        onMissingClaim: TypeAny,
    },
    additionalProperties: false,
};

export interface ErrorHandlers {
    onUnauthorised?: ErrorHandlerMiddleware;
    onTokenTheftDetected?: TokenTheftErrorHandlerMiddleware;
    onMissingClaim: ErrorHandlerMiddleware;
}

export type TypeInput = {
    cookieSecure?: boolean;
    cookieSameSite?: "strict" | "lax" | "none";
    sessionExpiredStatusCode?: number;
    cookieDomain?: string;
    errorHandlers?: ErrorHandlers;
    antiCsrf?: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    defaultClaims?: SessionClaim<any>[];
    defaultRequiredClaimChecks?: SessionClaimChecker[];
    missingClaimStatusCode?: number;
    jwt?:
        | {
              enable: true;
              propertyNameInAccessTokenPayload?: string;
              issuer?: string;
          }
        | { enable: false };
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

export const InputSchema = {
    type: "object",
    properties: {
        cookieSecure: TypeBoolean,
        cookieSameSite: TypeString,
        sessionExpiredStatusCode: TypeNumber,
        cookieDomain: TypeString,
        errorHandlers: InputSchemaErrorHandlers,
        defaultClaims: TypeAny,
        defaultRequiredClaimChecks: TypeAny,
        antiCsrf: TypeString,
        jwt: TypeAny,
        override: TypeAny,
    },
    additionalProperties: false,
};

export type TypeNormalisedInput = {
    refreshTokenPath: NormalisedURLPath;
    cookieDomain: string | undefined;
    cookieSameSite: "strict" | "lax" | "none";
    cookieSecure: boolean;
    sessionExpiredStatusCode: number;
    errorHandlers: NormalisedErrorHandlers;
    antiCsrf: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";

    // TODO: Maybe with better names...
    defaultClaims: SessionClaim<any>[];
    defaultRequiredClaimChecks: SessionClaimChecker[];

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
    requiredClaims?: SessionClaimChecker[];
}

export type RecipeInterface = {
    createNewSession(input: {
        res: any;
        userId: string;
        accessTokenPayload?: any;
        sessionData?: any;
        claimsToLoad?: SessionClaim<any>[];
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

    // TODO: mergeAccessTokenPayload?
    updateAccessTokenPayload(input: {
        sessionHandle: string;
        newAccessTokenPayload: any;
        userContext: any;
    }): Promise<void>;

    regenerateAccessToken(input: {
        accessToken: string;
        newAccessTokenPayload?: any;
        userContext: any;
    }): Promise<{
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

    getHandle(userContext?: any): string;

    getAccessToken(userContext?: any): string;

    regenerateToken(newAccessTokenPayload: any | undefined, userContext: any): Promise<void>;
    updateAccessTokenPayload(newAccessTokenPayload: any, userContext?: any): Promise<void>;

    getTimeCreated(userContext?: any): Promise<number>;

    getExpiry(userContext?: any): Promise<number>;

    updateClaim(claim: SessionClaim<any>, userContext?: any): Promise<void>;
    updateClaims(claims: SessionClaim<any>[], userContext?: any): Promise<void>;

    checkClaim(claimChecker: SessionClaimChecker, userContext?: any): Promise<boolean>;
    checkClaims(claimCheckers: SessionClaimChecker[], userContext?: any): Promise<string | undefined>;

    addClaim<T>(claim: SessionClaim<T>, value: T, userContext?: any): Promise<void>;
    removeClaim<T>(claim: SessionClaim<T>, userContext?: any): Promise<void>;
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

export type SessionInformation = {
    sessionHandle: string;
    userId: string;
    sessionData: any;
    expiry: number;
    accessTokenPayload: any;
    timeCreated: number;
};

export type SessionClaimChecker = (
    | // We split the type like this to express that either both claim and shouldRefetch is defined or neither.
    {
          claim: SessionClaim<any>;
          /**
           * Decides if we need to refetch the claim value before checking the payload with `isValid`.
           * E.g.: if the information in the payload is expired, or is not sufficient for this check.
           */
          shouldRefetch: (payload: any, userContext: any) => Awaitable<boolean>;
      }
    | {
          claimId: string;
      }
) & {
    /**
     * Decides if the claim is valid based on the payload (and not checking DB or anything else)
     */
    isValid: (payload: any, userContext: any) => Awaitable<boolean>;
};

export abstract class SessionClaim<T> {
    constructor(public readonly id: string) {}

    /**
     * This methods fetches the current value of this claim for the user.
     * The undefined return value signifies that we don't want to update the claim payload and or the claim value is not present in the database
     * This can happen for example with a second factor auth claim, where we don't want to add the claim to the session automatically.
     */
    abstract fetch(userId: string, userContext: any): Awaitable<T | undefined>;

    /**
     * Saves the provided value into the payload, by cloning and updating the entire object.
     *
     * @returns The modified payload object
     */
    abstract addToPayload(payload: any, value: T, userContext: any): any;

    /**
     * Removes the claim from the payload, by cloning and updating the entire object.
     *
     * @returns The modified payload object
     */
    abstract removeFromPayload(payload: any, userContext: any): any;
}
