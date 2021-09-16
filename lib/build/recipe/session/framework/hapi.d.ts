// @ts-nocheck
import { VerifySessionOptions } from "..";
import { ExtendedResponseToolkit, SessionRequest } from "../../../framework/hapi/framework";
export declare function verifySession(
    options?: VerifySessionOptions
): (req: SessionRequest, h: ExtendedResponseToolkit) => Promise<symbol>;
