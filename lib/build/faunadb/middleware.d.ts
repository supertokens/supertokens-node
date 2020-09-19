/// <reference types="express" />
import { ErrorHandlerMiddleware, SuperTokensErrorMiddlewareOptions } from "../types";
export declare function autoRefreshMiddleware(): (request: import("express").Request, response: import("express").Response, next: import("express").NextFunction) => Promise<void | import("express").Response>;
export declare function middleware(antiCsrfCheck?: boolean): (request: import("../types").SessionRequest, response: import("express").Response, next: import("express").NextFunction) => Promise<void>;
export declare function errorHandler(options?: SuperTokensErrorMiddlewareOptions): ErrorHandlerMiddleware;
