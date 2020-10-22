import { Response, NextFunction, Request } from "express";
import { SessionRequest, ErrorHandlerMiddleware, SuperTokensErrorMiddlewareOptions } from "./types";
export declare function autoRefreshMiddleware(): (request: Request, response: Response, next: NextFunction) => Promise<void | Response>;
export declare function middleware(antiCsrfCheck?: boolean): (request: SessionRequest, response: Response, next: NextFunction) => Promise<void>;
export declare function errorHandler(options?: SuperTokensErrorMiddlewareOptions): ErrorHandlerMiddleware;
