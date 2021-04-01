import Recipe from "../sessionRecipe";
import { Request, Response, NextFunction } from "express";
export default function signOutAPI(recipeInstance: Recipe, req: Request, res: Response, _: NextFunction): Promise<void>;
