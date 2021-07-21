import type { Handler } from "aws-lambda";
import { VerifySessionOptions } from "..";
export declare function verifySession(handler: Handler, verifySessionOptions?: VerifySessionOptions): Handler;
declare const _default: {
    verifySession: typeof verifySession;
};
export default _default;
