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
    },
    additionalProperties: false,
};

export interface ErrorHandlers {
    onUnauthorised?: ErrorHandlerMiddleware;
    onTokenTheftDetected?: TokenTheftErrorHandlerMiddleware;
}

export type TypeInput = {
    cookieSecure?: boolean;
    cookieSameSite?: "strict" | "lax" | "none";
    sessionExpiredStatusCode?: number;
    cookieDomain?: string;
    errorHandlers?: ErrorHandlers;
    antiCsrf?: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    jwt?: { enable: true; propertyNameInAccessTokenPayload?: string } | { enable: false };
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
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

export const InputSchema = {
    type: "object",
    properties: {
        cookieSecure: TypeBoolean,
        cookieSameSite: TypeString,
        sessionExpiredStatusCode: TypeNumber,
        cookieDomain: TypeString,
        errorHandlers: InputSchemaErrorHandlers,
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
    jwt:
        | { enable: true; propertyNameInAccessTokenPayload: string }
        | { enable: false; propertyNameInAccessTokenPayload: string };
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
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

export interface SessionRequest extends BaseRequest {
    session?: SessionContainerInterface;
}

export interface ErrorHandlerMiddleware {
    (message: string, request: BaseRequest, response: BaseResponse): Promise<void>;
}

export interface TokenTheftErrorHandlerMiddleware {
    (sessionHandle: string, userId: string, request: BaseRequest, response: BaseResponse): Promise<void>;
}

export interface NormalisedErrorHandlers {
    onUnauthorised: ErrorHandlerMiddleware;
    onTryRefreshToken: ErrorHandlerMiddleware;
    onTokenTheftDetected: TokenTheftErrorHandlerMiddleware;
}

export interface VerifySessionOptions {
    antiCsrfCheck?: boolean;
    sessionRequired?: boolean;
}

export type RecipeInterface = {
    createNewSession(input: {
        res: any;
        userId: string;
        accessTokenPayload?: any;
        sessionData?: any;
    }): Promise<SessionContainerInterface>;

    getSession(input: {
        req: any;
        res: any;
        options?: VerifySessionOptions;
    }): Promise<SessionContainerInterface | undefined>;

    refreshSession(input: { req: any; res: any }): Promise<SessionContainerInterface>;
    /**
     * Used to retrieve all session information for a given session handle. Can be used in place of:
     * - getSessionData
     * - getAccessTokenPayload
     */
    getSessionInformation(input: { sessionHandle: string }): Promise<SessionInformation>;

    revokeAllSessionsForUser(input: { userId: string }): Promise<string[]>;

    getAllSessionHandlesForUser(input: { userId: string }): Promise<string[]>;

    revokeSession(input: { sessionHandle: string }): Promise<boolean>;

    revokeMultipleSessions(input: { sessionHandles: string[] }): Promise<string[]>;

    updateSessionData(input: { sessionHandle: string; newSessionData: any }): Promise<void>;

    updateAccessTokenPayload(input: { sessionHandle: string; newAccessTokenPayload: any }): Promise<void>;

    getAccessTokenLifeTimeMS(): Promise<number>;

    getRefreshTokenLifeTimeMS(): Promise<number>;
};

export interface SessionContainerInterface {
    revokeSession(): Promise<void>;

    getSessionData(): Promise<any>;

    updateSessionData(newSessionData: any): Promise<any>;

    getUserId(): string;

    getAccessTokenPayload(): any;

    getHandle(): string;

    getAccessToken(): string;

    updateAccessTokenPayload(newAccessTokenPayload: any): Promise<void>;

    getTimeCreated(): Promise<number>;

    getExpiry(): Promise<number>;
}

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    jwtRecipeImplementation: JWTRecipeInterface | undefined;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};

export type APIInterface = {
    refreshPOST: undefined | ((input: { options: APIOptions }) => Promise<void>);

    signOutPOST:
        | undefined
        | ((input: {
              options: APIOptions;
          }) => Promise<{
              status: "OK";
          }>);

    verifySession(input: {
        verifySessionOptions: VerifySessionOptions | undefined;
        options: APIOptions;
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
