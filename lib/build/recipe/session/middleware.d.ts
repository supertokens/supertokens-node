import { Response, NextFunction, Request } from "express";
import { SessionRequest } from "./types";
import SessionRecipe from "./sessionRecipe";
export declare function verifySession(recipeInstance: SessionRecipe, antiCsrfCheck?: boolean): (request: SessionRequest, response: Response, next: NextFunction) => Promise<void>;
export declare function sendTryRefreshTokenResponse(recipeInstance: SessionRecipe, _: string, __: Request, response: Response, next: NextFunction): Promise<void>;
export declare function sendUnauthorisedResponse(recipeInstance: SessionRecipe, _: string, __: Request, response: Response, next: NextFunction): Promise<void>;
export declare function sendTokenTheftDetectedResponse(recipeInstance: SessionRecipe, sessionHandle: string, _: string, __: Request, response: Response, next: NextFunction): Promise<void>;
