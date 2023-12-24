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
async function listTenants(_, __, ___, userContext) {
    let tenantsRes = await multitenancy_1.default.listAllTenants(userContext);
    let finalTenants = [];
    let passwordlessContactMethod = undefined;
    try {
        const passwordlessRecipe = recipe_1.default.getInstanceOrThrowError();
        passwordlessContactMethod = passwordlessRecipe.config.contactMethod;
    } catch (_) {
        try {
            const thirdpartyPasswordlessRecipe = recipe_2.default.getInstanceOrThrowError();
            passwordlessContactMethod = thirdpartyPasswordlessRecipe.config.contactMethod;
        } catch (_) {}
    }
    if (tenantsRes.status !== "OK") {
        return tenantsRes;
    }
    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        let currentTenant = tenantsRes.tenants[i];
        let modifiedTenant = {
            tenantId: currentTenant.tenantId,
            emailPassword: currentTenant.emailPassword,
            passwordless: currentTenant.passwordless,
            thirdParty: currentTenant.thirdParty,
        };
        if (passwordlessContactMethod !== undefined) {
            modifiedTenant.passwordless.contactMethod = passwordlessContactMethod;
        }
        if (tenantsRes.tenants[i].tenantId === "public") {
            const publicTenantLoginMethodsInfo = getPublicTenantLoginMethodsInfo();
            modifiedTenant.emailPassword = publicTenantLoginMethodsInfo.emailPassword;
            modifiedTenant.passwordless = publicTenantLoginMethodsInfo.passwordless;
            modifiedTenant.thirdParty = publicTenantLoginMethodsInfo.thirdParty;
        }
        finalTenants.push(modifiedTenant);
    }
    return {
        status: "OK",
        tenants: finalTenants,
    };
}
exports.default = listTenants;
function getPublicTenantLoginMethodsInfo() {
    const passwordless = {
        enabled: false,
    };
    const emailPassword = {
        enabled: false,
    };
    const thirdParty = {
        enabled: false,
        providers: [],
    };
    try {
        const thirdpartyPasswordlessRecipe = recipe_2.default.getInstanceOrThrowError();
        passwordless.enabled = true;
        passwordless.contactMethod = thirdpartyPasswordlessRecipe.config.contactMethod;
        thirdParty.enabled = true;
        thirdParty.providers = thirdpartyPasswordlessRecipe.config.providers.map((provider) => provider.config);
    } catch (_) {
        try {
            const passwordlessRecipe = recipe_1.default.getInstanceOrThrowError();
            passwordless.enabled = true;
            passwordless.contactMethod = passwordlessRecipe.config.contactMethod;
        } catch (_) {}
    }
    try {
        const thirdpartyEmailPassword = recipe_4.default.getInstanceOrThrowError();
        emailPassword.enabled = true;
        thirdParty.enabled = true;
        thirdParty.providers = thirdpartyEmailPassword.config.providers.map((provider) => provider.config);
    } catch (_) {
        try {
            recipe_3.default.getInstanceOrThrowError();
            emailPassword.enabled = true;
        } catch (_) {}
    }
    try {
        const thirdPartyRecipe = recipe_5.default.getInstanceOrThrowError();
        thirdParty.enabled = true;
        thirdParty.providers = thirdPartyRecipe.providers.map((provider) => provider.config);
    } catch (_) {}
    return {
        emailPassword,
        passwordless,
        thirdParty,
    };
}
