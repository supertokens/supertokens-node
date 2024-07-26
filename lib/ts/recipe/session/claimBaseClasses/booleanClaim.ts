import type { SessionClaimValidator } from "../types";
import { SessionClaim } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";

export class BooleanClaim extends PrimitiveClaim<boolean> {
    constructor(conf: {
        key: string;
        fetchValue: SessionClaim<boolean>["fetchValue"];
        defaultMaxAgeInSeconds?: number;
    }) {
        super(conf);

        this.validators = {
            ...this.validators,
            isTrue: (maxAge?: number, id?: string): SessionClaimValidator => this.validators.hasValue(true, maxAge, id),
            isFalse: (maxAge?: number, id?: string): SessionClaimValidator =>
                this.validators.hasValue(false, maxAge, id),
        };
    }

    declare validators: PrimitiveClaim<boolean>["validators"] & {
        isTrue: (maxAge?: number, id?: string) => SessionClaimValidator;
        isFalse: (maxAge?: number, id?: string) => SessionClaimValidator;
    };
}
