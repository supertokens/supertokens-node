import Recipe from "../recipe";
import { Request, Response, NextFunction } from "express";
export default function authorisationUrlAPI(recipeInstance: Recipe, req: Request, res: Response, _: NextFunction): Promise<void>;
