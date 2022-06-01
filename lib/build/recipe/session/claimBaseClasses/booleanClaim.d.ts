// @ts-nocheck
import { SessionClaimBuilder } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";
export declare class BooleanClaim extends PrimitiveClaim<boolean> {
    readonly fetch: SessionClaimBuilder<boolean>["fetch"];
    constructor(conf: { key: string; fetch: SessionClaimBuilder<boolean>["fetch"] });
}
