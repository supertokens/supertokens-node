// @ts-nocheck
import { VerifySessionOptions } from "..";
import { ResponseToolkit } from "@hapi/hapi";
import { SessionRequest } from "../../../framework/hapi/framework";
export declare function verifySession(
    options?: VerifySessionOptions
): (req: SessionRequest, h: ResponseToolkit) => Promise<symbol | import("@hapi/hapi").ResponseObject>;
