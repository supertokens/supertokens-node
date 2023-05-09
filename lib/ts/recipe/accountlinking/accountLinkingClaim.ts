import { PrimitiveClaim } from "../session/claims";

class AccountLinkingClaimClass extends PrimitiveClaim<string> {
    constructor() {
        super({
            key: "st-linking",
            fetchValue(_, __, ___) {
                // We return undefined here cause we have no way of knowing which recipeId
                // this primary user will need to be linked with. We know this value only
                // when we want to set this claim in the actual API, and we can use
                // session.setClaimValue(..) for that.
                return undefined;
            },
        });
    }
}

export const AccountLinkingClaim = new AccountLinkingClaimClass();
