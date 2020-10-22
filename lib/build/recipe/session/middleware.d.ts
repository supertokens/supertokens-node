import { Response, NextFunction } from "express";
import { SessionRequest, ErrorHandlerMiddleware, SuperTokensErrorMiddlewareOptions } from "./types";
import SessionRecipe from "./sessionRecipe";
export declare function middleware(recipeInstance: SessionRecipe, antiCsrfCheck?: boolean): (request: SessionRequest, response: Response, next: NextFunction) => Promise<void>;
export declare function errorHandler(recipeInstance: SessionRecipe, options?: SuperTokensErrorMiddlewareOptions): ErrorHandlerMiddleware;
