import { PrimitiveClaim } from "../session/claims";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class AccountLinkingClaimClass extends PrimitiveClaim<string> {
    constructor() {
        super({
            key: "st-linking",
            fetchValue(_, __, ___) {
                return undefined;
            },
        });
    }
}

export const AccountLinkingClaim = new AccountLinkingClaimClass();
