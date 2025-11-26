"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deleteTenant;
async function deleteTenant({ stInstance, tenantId, userContext }) {
    try {
        const deleteTenantRes = await stInstance
            .getRecipeInstanceOrThrow("multitenancy")
            .recipeInterfaceImpl.deleteTenant({ tenantId, userContext });
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
