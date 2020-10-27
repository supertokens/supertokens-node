import Recipe from "./recipe";
import { Request, Response, NextFunction } from "express";
export declare function signUpAPI(recipeInstance: Recipe, request: Request, response: Response, next: NextFunction): Promise<void>;
