/// <reference types="express" />
import { ErrorHandlerMiddleware, SuperTokensErrorMiddlewareOptions, SessionRequest } from "./types";
import SessionRecipe from "./sessionRecipe";
export declare function middleware(recipeInstance: SessionRecipe, antiCsrfCheck?: boolean): (request: SessionRequest, response: import("express").Response, next: import("express").NextFunction) => Promise<void>;
export declare function errorHandler(recipeInstance: SessionRecipe, options?: SuperTokensErrorMiddlewareOptions): ErrorHandlerMiddleware;
