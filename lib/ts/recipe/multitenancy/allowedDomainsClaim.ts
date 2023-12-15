import { PrimitiveArrayClaim } from "../session/claims";
import Recipe from "./recipe";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class AllowedDomainsClaimClass extends PrimitiveArrayClaim<string> {
    constructor() {
        super({
            key: "st-t-dmns",
            async fetchValue(_userId, _recipeUserId, tenantId, _currentPayload, userContext) {
                const recipe = Recipe.getInstanceOrThrowError();

                if (recipe.getAllowedDomainsForTenantId === undefined) {
                    return undefined; // User did not provide a function to get allowed domains, but is using a validator. So we don't allow any domains by default
                }
                return await recipe.getAllowedDomainsForTenantId(tenantId, userContext);
            },
            defaultMaxAgeInSeconds: 3600,
        });
    }
}

export const AllowedDomainsClaim = new AllowedDomainsClaimClass();
