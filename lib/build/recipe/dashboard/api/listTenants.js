"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../multitenancy"));
async function listTenants(_, __, ___, userContext) {
    let tenantsRes = await multitenancy_1.default.listAllTenants(userContext);
    let finalTenants = [];
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
        finalTenants.push(modifiedTenant);
    }
    return {
        status: "OK",
        tenants: finalTenants,
    };
}
exports.default = listTenants;
