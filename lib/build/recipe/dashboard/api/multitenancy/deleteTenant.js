"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
async function deleteTenant(_, tenantId, __, userContext) {
    try {
        const deleteTenantRes = await multitenancy_1.default.deleteTenant(tenantId, userContext);
        return deleteTenantRes;
    } catch (err) {
        if (err.statusCodeFromCore === 403 && err.errorMessageFromCore.includes("Cannot delete public tenant")) {
            return {
                status: "CANNOT_DELETE_PUBLIC_TENANT_ERROR",
            };
        }
        throw err;
    }
}
exports.default = deleteTenant;
