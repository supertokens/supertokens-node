import Recipe from "../recipe";
import { Request, Response, NextFunction } from "express";
export declare function signUpAPI(recipeInstance: Recipe, req: Request, res: Response, next: NextFunction): Promise<void>;
