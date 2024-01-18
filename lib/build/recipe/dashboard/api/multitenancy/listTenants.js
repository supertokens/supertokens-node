"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const supertokens_1 = __importDefault(require("../../../../supertokens"));
async function listTenants(_, __, options, userContext) {
    const shouldIncludeUserCount = options.req.getKeyValueFromQuery("includeUserCount");
    let tenantsRes = await multitenancy_1.default.listAllTenants(userContext);
    let finalTenants = [];
    if (tenantsRes.status !== "OK") {
        return tenantsRes;
    }
    // TODO: Add an API to core to get user count for all tenants in one go
    let tenantsUserCount;
    if (shouldIncludeUserCount) {
        tenantsUserCount = await Promise.all(
            tenantsRes.tenants.map((tenant) => {
                return supertokens_1.default.getInstanceOrThrowError().getUserCount(undefined, tenant.tenantId);
            })
        );
    }
    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        let currentTenant = tenantsRes.tenants[i];
        let modifiedTenant = {
            tenantId: currentTenant.tenantId,
            emailPassword: currentTenant.emailPassword,
            passwordless: currentTenant.passwordless,
            thirdParty: currentTenant.thirdParty,
        };
        if (shouldIncludeUserCount && Array.isArray(tenantsUserCount)) {
            modifiedTenant.userCount = tenantsUserCount[i];
        }
        finalTenants.push(modifiedTenant);
    }
    return {
        status: "OK",
        tenants: finalTenants,
    };
}
exports.default = listTenants;
