// @ts-nocheck
import { SessionClaim, SessionClaimValidator } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";
export declare class BooleanClaim extends PrimitiveClaim<boolean> {
    constructor(conf: { key: string; fetchValue: SessionClaim<boolean>["fetchValue"] });
    validators: PrimitiveClaim<boolean>["validators"] & {
        isTrue: (maxAge?: number) => SessionClaimValidator;
        isFalse: (maxAge?: number) => SessionClaimValidator;
    };
}
