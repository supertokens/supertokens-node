import type { VerifySessionOptions } from "..";
import type { Next } from "koa";
import type { SessionContext } from "../../../framework/koa/framework";
export declare function verifySession(
    options: VerifySessionOptions | undefined
): (ctx: SessionContext, next: Next) => Promise<void>;
