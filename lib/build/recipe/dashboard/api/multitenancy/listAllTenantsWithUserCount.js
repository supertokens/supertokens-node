"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_1 = __importDefault(require("../../../../supertokens"));
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
async function listAllTenantsWithUserCount(_, __, ___, userContext) {
    const tenantsRes = await multitenancy_1.default.listAllTenants(userContext);
    // TODO: Add an API to core to get user count for all tenants in one go
    const usersCount = await Promise.all(
        tenantsRes.tenants.map((tenant) => {
            return supertokens_1.default.getInstanceOrThrowError().getUserCount(undefined, tenant.tenantId);
        })
    );
    const tenantsWithUserCount = tenantsRes.tenants.map((tenant, index) => {
        return {
            tenantId: tenant.tenantId,
            userCount: usersCount[index],
        };
    });
    return {
        status: "OK",
        tenants: tenantsWithUserCount,
    };
}
exports.default = listAllTenantsWithUserCount;
