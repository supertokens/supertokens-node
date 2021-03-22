import Recipe from "../recipe";
import { Request, Response, NextFunction } from "express";
export default function generatePasswordResetToken(recipeInstance: Recipe, req: Request, res: Response, _: NextFunction): Promise<void>;
