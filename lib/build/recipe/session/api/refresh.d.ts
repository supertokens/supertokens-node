import { Response, NextFunction, Request } from "express";
import SessionRecipe from "../recipe";
export default function handleRefreshAPI(
    recipeInstance: SessionRecipe,
    request: Request,
    response: Response,
    _: NextFunction
): Promise<void>;
