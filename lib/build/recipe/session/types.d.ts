import { Request, Response, NextFunction } from "express";
import Session from "./sessionClass";
import NormalisedURLPath from "../../normalisedURLPath";
import * as express from "express";
import RecipeImplementation from "./recipeImplementation";
export declare type HandshakeInfo = {
    jwtSigningPublicKey: string;
    antiCsrf: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    accessTokenBlacklistingEnabled: boolean;
    jwtSigningPublicKeyExpiryTime: number;
    accessTokenValidity: number;
    refreshTokenValidity: number;
};
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
export declare const InputSchemaErrorHandlers: {
    type: string;
    properties: {
        onUnauthorised: {
            type: string;
        };
        onTokenTheftDetected: {
            type: string;
        };
    };
    additionalProperties: boolean;
};
export interface ErrorHandlers {
    onUnauthorised?: ErrorHandlerMiddleware;
    onTokenTheftDetected?: TokenTheftErrorHandlerMiddleware;
}
export declare type TypeInput = {
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
        functions?: (originalImplementation: RecipeInterface) => RecipeInterface;
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
        sessionRefreshFeature: {
            type: string;
            properties: {
                disableDefaultImplementation: {
                    type: string;
                };
            };
            additionalProperties: boolean;
        };
        signOutFeature: {
            type: string;
            properties: {
                disableDefaultImplementation: {
                    type: string;
                };
            };
            additionalProperties: boolean;
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
            };
            additionalProperties: boolean;
        };
        antiCsrf: {
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
    session?: Session;
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
    createNewSession(res: express.Response, userId: string, jwtPayload?: any, sessionData?: any): Promise<Session>;
    getSession(
        req: express.Request,
        res: express.Response,
        options?: VerifySessionOptions
    ): Promise<Session | undefined>;
    refreshSession(req: express.Request, res: express.Response): Promise<Session>;
    revokeAllSessionsForUser(userId: string): Promise<string[]>;
    getAllSessionHandlesForUser(userId: string): Promise<string[]>;
    revokeSession(sessionHandle: string): Promise<boolean>;
    revokeMultipleSessions(sessionHandles: string[]): Promise<string[]>;
    getSessionData(sessionHandle: string): Promise<any>;
    updateSessionData(sessionHandle: string, newSessionData: any): Promise<void>;
    getJWTPayload(sessionHandle: string): Promise<any>;
    updateJWTPayload(sessionHandle: string, newJWTPayload: any): Promise<void>;
}
