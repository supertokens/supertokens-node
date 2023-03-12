"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountLinkingClaim = exports.AccountLinkingClaimClass = void 0;
const claims_1 = require("../session/claims");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class AccountLinkingClaimClass extends claims_1.PrimitiveClaim {
    constructor() {
        super({
            key: "st-linking",
            fetchValue(_, __, ___) {
                return undefined;
            },
        });
    }
}
exports.AccountLinkingClaimClass = AccountLinkingClaimClass;
exports.AccountLinkingClaim = new AccountLinkingClaimClass();
