import { Request, Response, NextFunction } from "express";
import { Session } from "./express";
export declare type TypeAuthError = {
    errType: number;
    err: any;
};
export declare type TypeInput = {
    hosts?: string;
    accessTokenPath?: string;
    refreshTokenPath?: string;
    cookieDomain?: string;
    cookieSameSite?: "strict" | "lax" | "none";
    cookieSecure?: boolean;
    apiKey?: string;
};
export interface SessionRequest extends Request {
    session: Session;
}
export interface ErrorHandlerMiddleware {
    (err: any, request: Request, response: Response, next: NextFunction): void;
}
export interface TokenTheftErrorHandlerMiddleware {
    (sessionHandle: string, userId: string, request: Request, response: Response, next: NextFunction): void;
}
export interface SuperTokensErrorMiddlewareOptions {
    onUnauthorised?: ErrorHandlerMiddleware;
    onTryRefreshToken?: ErrorHandlerMiddleware;
    onTokenTheftDetected?: TokenTheftErrorHandlerMiddleware;
}
export declare type auth0RequestBody = {
    action: "login";
    code: string;
    redirect_uri: string;
} | {
    action: "refresh";
    code?: string;
    redirect_uri?: string;
} | {
    action: "logout";
};
