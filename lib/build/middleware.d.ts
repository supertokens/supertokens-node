import { Response, NextFunction } from "express";
import { SesssionRequest, ErrorHandlerMiddleware, SuperTokensErrorMiddlewareOptions } from "./types";
export declare function middleware(antiCsrfCheck?: boolean): (request: SesssionRequest, response: Response, next: NextFunction) => Promise<void>;
export declare function errorHandler(options: SuperTokensErrorMiddlewareOptions): ErrorHandlerMiddleware;
