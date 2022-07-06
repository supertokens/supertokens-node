// @ts-nocheck
import { BooleanClaim } from "../session/claims";
import { SessionClaimValidator } from "../session";
export declare class EmailVerifiedClaimClass extends BooleanClaim {
    constructor();
    validators: BooleanClaim["validators"] & {
        isValidated: (recheckDelayInSeconds?: number) => SessionClaimValidator;
    };
}
export declare const EmailVerifiedClaim: EmailVerifiedClaimClass;
