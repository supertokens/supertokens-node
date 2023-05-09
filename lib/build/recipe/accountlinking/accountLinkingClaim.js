"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountLinkingClaim = void 0;
const claims_1 = require("../session/claims");
class AccountLinkingClaimClass extends claims_1.PrimitiveClaim {
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
exports.AccountLinkingClaim = new AccountLinkingClaimClass();
