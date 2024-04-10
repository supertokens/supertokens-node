import MultitenancyRecipe from "../../../multitenancy/recipe";
import { isFactorConfiguredForTenant } from "../../../multitenancy/utils";
import { TenantConfig } from "../../../multitenancy/types";

export function normaliseTenantLoginMethodsWithInitConfig(tenantDetailsFromCore: TenantConfig): string[] {
    let firstFactors: string[];

    let mtInstance = MultitenancyRecipe.getInstanceOrThrowError();
    if (tenantDetailsFromCore.firstFactors !== undefined) {
        firstFactors = tenantDetailsFromCore.firstFactors; // highest priority, config from core
    } else if (mtInstance.staticFirstFactors !== undefined) {
        firstFactors = mtInstance.staticFirstFactors; // next priority, static config
    } else {
        // Fallback to all available factors (de-duplicated)
        firstFactors = Array.from(new Set(mtInstance.allAvailableFirstFactors));
    }

    // we now filter out all available first factors by checking if they are valid because
    // we want to return the ones that can work. this would be based on what recipes are enabled
    // on the core and also firstFactors configured in the core and supertokens.init
    // Also, this way, in the front end, the developer can just check for firstFactors for
    // enabled recipes in all cases irrespective of whether they are using MFA or not
    let validFirstFactors: string[] = [];
    for (const factorId of firstFactors) {
        if (
            isFactorConfiguredForTenant({
                tenantConfig: tenantDetailsFromCore,
                allAvailableFirstFactors: mtInstance.allAvailableFirstFactors,
                firstFactors: firstFactors,
                factorId,
            })
        ) {
            validFirstFactors.push(factorId);
        }
    }

    return validFirstFactors;
}
