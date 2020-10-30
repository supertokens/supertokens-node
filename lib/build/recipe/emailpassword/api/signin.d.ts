import Recipe from "../recipe";
import { Request, Response, NextFunction } from "express";
export default function signInAPI(recipeInstance: Recipe, req: Request, res: Response, next: NextFunction): Promise<void>;
