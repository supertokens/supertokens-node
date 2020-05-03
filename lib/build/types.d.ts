import { Request, Response, NextFunction } from "express";
import { Session } from "./express";
export declare type TypeAuthError = {
    errType: number;
    err: any;
};
export declare type TypeInput = {
    hostname: string;
    port: number;
}[];
export interface SesssionRequest extends Request {
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
