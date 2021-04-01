import Recipe from "../recipe";
import { Request, Response, NextFunction } from "express";
export default function signOutAPI(_: Recipe, req: Request, res: Response, __: NextFunction): Promise<void>;
