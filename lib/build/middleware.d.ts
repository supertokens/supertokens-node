import { Response, NextFunction } from "express";
import { SessionRequest, ErrorHandlerMiddleware, SuperTokensErrorMiddlewareOptions } from "./types";
export declare function middleware(antiCsrfCheck?: boolean): (request: SessionRequest, response: Response, next: NextFunction) => Promise<void>;
export declare function errorHandler(options?: SuperTokensErrorMiddlewareOptions): ErrorHandlerMiddleware;
