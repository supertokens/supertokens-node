import { Response, NextFunction, Request } from "express";
import SessionRecipe from "./sessionRecipe";
export declare function handleRefreshAPI(recipeInstance: SessionRecipe, request: Request, response: Response, next: NextFunction): Promise<Response>;
