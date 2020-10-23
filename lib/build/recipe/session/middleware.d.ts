import { Response, NextFunction, Request } from "express";
import { SessionRequest } from "./types";
import SessionRecipe from "./sessionRecipe";
export declare function verifySession(recipeInstance: SessionRecipe, antiCsrfCheck?: boolean): (request: SessionRequest, response: Response, next: NextFunction) => Promise<void>;
export declare function sendTryRefreshTokenResponse(recipeInstance: SessionRecipe, message: string, request: Request, response: Response, next: NextFunction): Promise<void>;
export declare function sendUnauthorisedResponse(recipeInstance: SessionRecipe, message: string, request: Request, response: Response, next: NextFunction): Promise<void>;
export declare function sendTokenTheftDetectedResponse(recipeInstance: SessionRecipe, sessionHandle: string, userId: string, request: Request, response: Response, next: NextFunction): Promise<void>;
