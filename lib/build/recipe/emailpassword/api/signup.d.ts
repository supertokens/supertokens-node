import Recipe from "../recipe";
import { Request, Response, NextFunction } from "express";
export default function signUpAPI(recipeInstance: Recipe, req: Request, res: Response, _: NextFunction): Promise<void>;
