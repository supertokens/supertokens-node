import { VerifySessionOptions } from "..";
import { Context, Next } from "koa";
export declare function verifySession(
    options: VerifySessionOptions | undefined
): (ctx: Context, next: Next) => Promise<void>;
declare const _default: {
    verifySession: typeof verifySession;
};
export default _default;
