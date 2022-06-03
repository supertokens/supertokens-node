// @ts-nocheck
import { SessionClaim } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";
export declare class BooleanClaim extends PrimitiveClaim<boolean> {
    readonly fetchValue: SessionClaim<boolean>["fetchValue"];
    constructor(conf: { key: string; fetchValue: SessionClaim<boolean>["fetchValue"] });
}
