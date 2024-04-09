"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
async function deleteTenant(_, tenantId, __, userContext) {
    const deleteTenantRes = await multitenancy_1.default.deleteTenant(tenantId, userContext);
    return deleteTenantRes;
}
exports.default = deleteTenant;
