"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listAllTenantsWithLoginMethods;
const utils_1 = require("./utils");
async function listAllTenantsWithLoginMethods({ stInstance, userContext }) {
    const mtRecipe = stInstance.getRecipeInstanceOrThrow("multitenancy");
    const tenantsRes = await mtRecipe.recipeInterfaceImpl.listAllTenants({
        userContext,
    });
    const finalTenants = [];
    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        const currentTenant = tenantsRes.tenants[i];
        const loginMethods = (0, utils_1.getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit)(
            stInstance,
            currentTenant
        );
        finalTenants.push({
            tenantId: currentTenant.tenantId,
            firstFactors: loginMethods,
        });
    }
    return {
        status: "OK",
        tenants: finalTenants,
    };
}
