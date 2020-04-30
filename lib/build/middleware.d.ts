import { Response, NextFunction } from "express";
import { SesssionRequest } from "./types";
export declare function sessionVerify(antiCsrfCheck?: boolean): (request: SesssionRequest, response: Response, next: NextFunction) => Promise<void>;
