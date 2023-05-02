import { PrimitiveClaim } from "../session/claims";
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export declare class AccountLinkingClaimClass extends PrimitiveClaim<string> {
    constructor();
}
export declare const AccountLinkingClaim: AccountLinkingClaimClass;
