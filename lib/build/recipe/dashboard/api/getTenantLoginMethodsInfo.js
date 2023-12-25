"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../multitenancy"));
const recipe_1 = __importDefault(require("../../passwordless/recipe"));
const recipe_2 = __importDefault(require("../../thirdpartypasswordless/recipe"));
const recipe_3 = __importDefault(require("../../emailpassword/recipe"));
const recipe_4 = __importDefault(require("../../thirdpartyemailpassword/recipe"));
const recipe_5 = __importDefault(require("../../thirdparty/recipe"));
async function getTenantLoginMethodsInfo(_, __, ___, userContext) {
    const tenantsRes = await multitenancy_1.default.listAllTenants(userContext);
    const finalTenants = [];
    if (tenantsRes.status !== "OK") {
        return tenantsRes;
    }
    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        const currentTenant = tenantsRes.tenants[i];
        const normalisedTenantLoginMethodsInfo = normaliseTenantLoginMethodsWithInitConfig({
            tenantId: currentTenant.tenantId,
            emailPassword: currentTenant.emailPassword,
            passwordless: currentTenant.passwordless,
            thirdParty: currentTenant.thirdParty,
        });
        finalTenants.push(normalisedTenantLoginMethodsInfo);
    }
    return {
        status: "OK",
        tenants: finalTenants,
    };
}
exports.default = getTenantLoginMethodsInfo;
function normaliseTenantLoginMethodsWithInitConfig(tenantDetailsFromCore) {
    const normalisedTenantLoginMethodsInfo = {
        tenantId: tenantDetailsFromCore.tenantId,
        emailPassword: {
            enabled: false,
        },
        passwordless: {
            enabled: false,
        },
        thirdParty: {
            enabled: false,
            providers: tenantDetailsFromCore.thirdParty.providers,
        },
    };
    if (tenantDetailsFromCore.passwordless.enabled === true) {
        try {
            const thirdpartyPasswordlessRecipe = recipe_2.default.getInstanceOrThrowError();
            normalisedTenantLoginMethodsInfo.passwordless.enabled = true;
            normalisedTenantLoginMethodsInfo.passwordless.contactMethod =
                thirdpartyPasswordlessRecipe.config.contactMethod;
            normalisedTenantLoginMethodsInfo.thirdParty.enabled = true;
        } catch (_) {
            try {
                const passwordlessRecipe = recipe_1.default.getInstanceOrThrowError();
                normalisedTenantLoginMethodsInfo.passwordless.enabled = true;
                normalisedTenantLoginMethodsInfo.passwordless.contactMethod = passwordlessRecipe.config.contactMethod;
            } catch (_) {}
        }
    }
    if (tenantDetailsFromCore.emailPassword.enabled === true) {
        try {
            recipe_4.default.getInstanceOrThrowError();
            normalisedTenantLoginMethodsInfo.emailPassword.enabled = true;
            normalisedTenantLoginMethodsInfo.thirdParty.enabled = true;
        } catch (_) {
            try {
                recipe_3.default.getInstanceOrThrowError();
                normalisedTenantLoginMethodsInfo.emailPassword.enabled = true;
            } catch (_) {}
        }
    }
    if (tenantDetailsFromCore.thirdParty.enabled === true) {
        try {
            recipe_5.default.getInstanceOrThrowError();
            normalisedTenantLoginMethodsInfo.thirdParty.enabled = true;
        } catch (_) {}
    }
    return normalisedTenantLoginMethodsInfo;
}
