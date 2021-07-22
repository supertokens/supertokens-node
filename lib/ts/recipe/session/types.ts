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
import { Request, Response, NextFunction } from "express";
import NormalisedURLPath from "../../normalisedURLPath";
import * as express from "express";

export type HandshakeInfo = {
    jwtSigningPublicKey: string;
    antiCsrf: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    accessTokenBlacklistingEnabled: boolean;
    jwtSigningPublicKeyExpiryTime: number;
    accessTokenValidity: number;
    refreshTokenValidity: number;
    signingKeyLastUpdated: number;
};

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
    override?: {
        functions?: (originalImplementation: RecipeInterface) => RecipeInterface;
        apis?: (originalImplementation: OriginalAPIInterface) => APIInterface;
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
    override: {
        functions: (originalImplementation: RecipeInterface) => RecipeInterface;
        apis: (originalImplementation: OriginalAPIInterface) => APIInterface;
    };
};

export interface SessionRequest extends Request {
    session?: SessionContainerInterface;
}

export interface ErrorHandlerMiddleware {
    (message: string, request: Request, response: Response, next: NextFunction): void;
}

export interface TokenTheftErrorHandlerMiddleware {
    (sessionHandle: string, userId: string, request: Request, response: Response, next: NextFunction): void;
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

export interface RecipeInterface {
    createNewSession(input: {
        res: express.Response;
        userId: string;
        jwtPayload?: any;
        sessionData?: any;
    }): Promise<SessionContainerInterface>;

    getSession(input: {
        req: express.Request;
        res: express.Response;
        options?: VerifySessionOptions;
    }): Promise<SessionContainerInterface | undefined>;

    refreshSession(input: { req: express.Request; res: express.Response }): Promise<SessionContainerInterface>;

    revokeAllSessionsForUser(input: { userId: string }): Promise<string[]>;

    getAllSessionHandlesForUser(input: { userId: string }): Promise<string[]>;

    revokeSession(input: { sessionHandle: string }): Promise<boolean>;

    revokeMultipleSessions(input: { sessionHandles: string[] }): Promise<string[]>;

    getSessionData(input: { sessionHandle: string }): Promise<any>;

    updateSessionData(input: { sessionHandle: string; newSessionData: any }): Promise<void>;

    getJWTPayload(input: { sessionHandle: string }): Promise<any>;

    updateJWTPayload(input: { sessionHandle: string; newJWTPayload: any }): Promise<void>;

    getAccessTokenLifeTimeMS(): Promise<number>;

    getRefreshTokenLifeTimeMS(): Promise<number>;
}

export interface SessionContainerInterface {
    revokeSession(): Promise<void>;

    getSessionData(): Promise<any>;

    updateSessionData(newSessionData: any): Promise<any>;

    getUserId(): string;

    getJWTPayload(): any;

    getHandle(): string;

    getAccessToken(): string;

    updateJWTPayload(newJWTPayload: any): Promise<void>;
}

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: Request;
    res: Response;
    next: NextFunction;
};

export interface OriginalAPIInterface {
    refreshPOST: (input: { options: APIOptions }) => Promise<void>;

    signOutPOST: (input: {
        options: APIOptions;
    }) => Promise<{
        status: "OK";
    }>;

    verifySession(input: {
        verifySessionOptions: VerifySessionOptions | undefined;
        options: APIOptions;
    }): Promise<void>;
}

export interface APIInterface {
    refreshPOST: (input: { options: APIOptions }) => Promise<void>;

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
    }): Promise<void>;
}
