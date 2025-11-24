"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listAllTenantsWithLoginMethods;
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const utils_1 = require("./utils");
async function listAllTenantsWithLoginMethods(_, __, ___, userContext) {
    const tenantsRes = await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listAllTenants({
        userContext,
    });
    const finalTenants = [];
    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        const currentTenant = tenantsRes.tenants[i];
        const loginMethods = (0, utils_1.getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit)(currentTenant);
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
