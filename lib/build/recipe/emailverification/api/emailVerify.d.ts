import Recipe from "../recipe";
import { Request, Response, NextFunction } from "express";
import { APIInterface } from "../";
export default function emailVerify(
    apiImplementation: APIInterface,
    recipeInstance: Recipe,
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void>;
