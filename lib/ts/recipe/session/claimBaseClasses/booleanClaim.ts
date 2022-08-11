import { SessionClaim, SessionClaimValidator } from "../types";
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
            isTrue: (maxAge?: number): SessionClaimValidator => this.validators.hasValue(true, maxAge),
            isFalse: (maxAge?: number): SessionClaimValidator => this.validators.hasValue(false, maxAge),
        };
    }

    validators!: PrimitiveClaim<boolean>["validators"] & {
        isTrue: (maxAge?: number) => SessionClaimValidator;
        isFalse: (maxAge?: number) => SessionClaimValidator;
    };
}
