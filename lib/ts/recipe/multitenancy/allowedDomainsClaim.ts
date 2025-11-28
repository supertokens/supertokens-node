import { PrimitiveArrayClaim } from "../session/claims";
import type Recipe from "./recipe";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class AllowedDomainsClaimClass extends PrimitiveArrayClaim<string> {
    constructor(getRecipe: () => Recipe) {
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
