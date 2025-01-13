"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deleteTenant;
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
async function deleteTenant(_, tenantId, __, userContext) {
    try {
        const deleteTenantRes = await multitenancy_1.default.deleteTenant(tenantId, userContext);
        return deleteTenantRes;
    } catch (err) {
        const errMsg = err.message;
        if (errMsg.includes("SuperTokens core threw an error for a ") && errMsg.includes("with status code: 403")) {
            return {
                status: "CANNOT_DELETE_PUBLIC_TENANT_ERROR",
            };
        }
        throw err;
    }
}
