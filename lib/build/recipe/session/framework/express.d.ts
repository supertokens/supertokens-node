import { VerifySessionOptions } from "..";
import { SessionRequest } from "../../../framework/express/framework";
import { NextFunction, Response } from "express";
export declare function verifySession(
    options: VerifySessionOptions | undefined
): (req: SessionRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    verifySession: typeof verifySession;
};
export default _default;
