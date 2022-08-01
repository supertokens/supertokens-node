// @ts-nocheck
import type { VerifySessionOptions } from "..";
import type { SessionRequest } from "../../../framework/express/framework";
import type { NextFunction, Response } from "express";
export declare function verifySession(
    options?: VerifySessionOptions
): (req: SessionRequest, res: Response<any, Record<string, any>>, next: NextFunction) => Promise<void>;
