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
import { RecipeImplementation } from "./";

export type HandshakeInfo = {
    jwtSigningPublicKey: string;
    antiCsrf: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    accessTokenBlacklistingEnabled: boolean;
    jwtSigningPublicKeyExpiryTime: number;
    accessTokenValidity: number;
    refreshTokenValidity: number;
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
    sessionRefreshFeature?: {
        disableDefaultImplementation?: boolean;
    };
    signOutFeature?: {
        disableDefaultImplementation?: boolean;
    };
    errorHandlers?: ErrorHandlers;
    antiCsrf?: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    override?: {
        functions?: (originalImplementation: RecipeImplementation) => RecipeInterface;
    };
};

export const InputSchema = {
    type: "object",
    properties: {
        cookieSecure: TypeBoolean,
        cookieSameSite: TypeString,
        sessionExpiredStatusCode: TypeNumber,
        cookieDomain: TypeString,
        sessionRefreshFeature: {
            type: "object",
            properties: {
                disableDefaultImplementation: TypeBoolean,
            },
            additionalProperties: false,
        },
        signOutFeature: {
            type: "object",
            properties: {
                disableDefaultImplementation: TypeBoolean,
            },
            additionalProperties: false,
        },
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
    sessionRefreshFeature: {
        disableDefaultImplementation: boolean;
    };
    signOutFeature: {
        disableDefaultImplementation: boolean;
    };
    errorHandlers: NormalisedErrorHandlers;
    antiCsrf: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    override: {
        functions: (originalImplementation: RecipeImplementation) => RecipeInterface;
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
    createNewSession(
        res: express.Response,
        userId: string,
        jwtPayload?: any,
        sessionData?: any
    ): Promise<SessionContainerInterface>;

    getSession(
        req: express.Request,
        res: express.Response,
        options?: VerifySessionOptions
    ): Promise<SessionContainerInterface | undefined>;

    refreshSession(req: express.Request, res: express.Response): Promise<SessionContainerInterface>;

    revokeAllSessionsForUser(userId: string): Promise<string[]>;

    getAllSessionHandlesForUser(userId: string): Promise<string[]>;

    revokeSession(sessionHandle: string): Promise<boolean>;

    revokeMultipleSessions(sessionHandles: string[]): Promise<string[]>;

    getSessionData(sessionHandle: string): Promise<any>;

    updateSessionData(sessionHandle: string, newSessionData: any): Promise<void>;

    getJWTPayload(sessionHandle: string): Promise<any>;

    updateJWTPayload(sessionHandle: string, newJWTPayload: any): Promise<void>;
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
