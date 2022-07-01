// @ts-nocheck
import { SessionClaim } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";
export declare class BooleanClaim extends PrimitiveClaim<boolean> {
    constructor(conf: { key: string; fetchValue: SessionClaim<boolean>["fetchValue"] });
}
