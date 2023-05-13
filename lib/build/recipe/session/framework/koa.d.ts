// @ts-nocheck
import type { VerifySessionOptions } from "..";
import type { Next } from "koa";
import type { SessionContext } from "../../../framework/koa/framework";
export declare function verifySession(
    options?: VerifySessionOptions
): (ctx: SessionContext, next: Next) => Promise<void>;
