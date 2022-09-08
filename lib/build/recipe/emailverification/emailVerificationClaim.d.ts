// @ts-nocheck
import { BooleanClaim } from "../session/claims";
import { SessionClaimValidator } from "../session";
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export declare class EmailVerificationClaimClass extends BooleanClaim {
    constructor();
    validators: BooleanClaim["validators"] & {
        isVerified: (refetchTimeOnFalseInSeconds?: number, maxAgeInSeconds?: number) => SessionClaimValidator;
    };
}
export declare const EmailVerificationClaim: EmailVerificationClaimClass;
