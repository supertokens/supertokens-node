import { PrimitiveArrayClaim } from "../session/claims";
import Recipe from "./recipe";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class AllowedDomainsClaimClass extends PrimitiveArrayClaim<string> {
    constructor() {
        super({
            key: "st-t-dmns",
            async fetchValue(_, tenantId, userContext) {
                const recipe = Recipe.getInstanceOrThrowError();

                if (recipe.getAllowedDomainsForTenantId === undefined) {
                    return undefined; // User did not provide a function to get allowed domains, but is using a validator. So we don't allow any domains by default
                }
                return await recipe.getAllowedDomainsForTenantId(tenantId, userContext);
            },
            defaultMaxAgeInSeconds: 3600,
        });
    }

    getValueFromPayload(payload: any, _userContext?: any): string[] | undefined {
        const res = payload[this.key]?.v;
        if (res === undefined) {
            return [];
        }
        return res;
    }

    getLastRefetchTime(payload: any, _userContext?: any): number | undefined {
        const res = payload[this.key]?.t;
        if (res === undefined) {
            return Date.now();
        }
        return res;
    }
}

export const AllowedDomainsClaim = new AllowedDomainsClaimClass();
