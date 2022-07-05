import { SessionClaim, SessionClaimValidator } from "../types";
import { PrimitiveClaim } from "./primitiveClaim";

export class BooleanClaim extends PrimitiveClaim<boolean> {
    constructor(conf: { key: string; fetchValue: SessionClaim<boolean>["fetchValue"] }) {
        super(conf);

        this.validators = {
            ...this.validators,
            isTrue: (maxAge?: number): SessionClaimValidator => {
                if (maxAge) {
                    return this.validators.hasFreshValue(true, maxAge);
                }
                return this.validators.hasValue(true);
            },
            isFalse: (maxAge?: number): SessionClaimValidator => {
                if (maxAge) {
                    return this.validators.hasFreshValue(false, maxAge);
                }
                return this.validators.hasValue(false);
            },
        };
    }

    validators!: PrimitiveClaim<boolean>["validators"] & {
        isTrue: (maxAge?: number) => SessionClaimValidator;
        isFalse: (maxAge?: number) => SessionClaimValidator;
    };
}
