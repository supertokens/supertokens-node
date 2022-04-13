// @ts-nocheck
import { SessionClaim } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";
export declare class BooleanClaim extends PrimitiveClaim<boolean> {
    readonly fetch: SessionClaim<boolean>["fetch"];
    constructor(conf: { key: string; fetch: SessionClaim<boolean>["fetch"] });
}
