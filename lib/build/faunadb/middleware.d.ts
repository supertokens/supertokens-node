import { Response, NextFunction } from "express";
import { ErrorHandlerMiddleware, SuperTokensErrorMiddlewareOptions, SessionRequest } from "../types";
export declare function autoRefreshMiddleware(): (request: SessionRequest, response: Response, next: NextFunction) => Promise<void>;
export declare function middleware(antiCsrfCheck?: boolean): (request: SessionRequest, response: Response, next: NextFunction) => Promise<void>;
export declare function errorHandler(options?: SuperTokensErrorMiddlewareOptions): ErrorHandlerMiddleware;
