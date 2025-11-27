"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowedDomainsClaimClass = void 0;
const claims_1 = require("../session/claims");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class AllowedDomainsClaimClass extends claims_1.PrimitiveArrayClaim {
    constructor(getRecipe) {
        super({
            key: "st-t-dmns",
            async fetchValue(_userId, _recipeUserId, tenantId, _currentPayload, userContext) {
                let getAllowedDomainsForTenantId = getRecipe().getAllowedDomainsForTenantId;
                if (getAllowedDomainsForTenantId === undefined) {
                    return undefined; // User did not provide a function to get allowed domains, but is using a validator. So we don't allow any domains by default
                }
                return await getAllowedDomainsForTenantId(tenantId, userContext);
            },
        });
    }
}
exports.AllowedDomainsClaimClass = AllowedDomainsClaimClass;
