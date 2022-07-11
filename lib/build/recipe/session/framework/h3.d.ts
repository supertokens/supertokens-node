// @ts-nocheck
/// <reference types="node" />
import type { VerifySessionOptions } from "../types";
import type { SessionRequest } from "../../../framework/h3";
import { ServerResponse } from "http";
export declare function verifySession(
    options?: VerifySessionOptions
): (req: SessionRequest, res: ServerResponse, next: (err?: Error | undefined) => any) => Promise<void>;
