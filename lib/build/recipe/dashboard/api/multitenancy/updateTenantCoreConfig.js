"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateTenantCoreConfig;
async function updateTenantCoreConfig({ stInstance, tenantId, options, userContext }) {
    const requestBody = await options.req.getJSONBody();
    const { name, value } = requestBody;
    const mtRecipe = stInstance.getRecipeInstanceOrThrow("multitenancy");
    const tenantRes = await mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext });
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    try {
        await mtRecipe.recipeInterfaceImpl.createOrUpdateTenant({
            tenantId,
            config: {
                coreConfig: {
                    [name]: value,
                },
            },
            userContext,
        });
    } catch (err) {
        const errMsg = err.message;
        if (errMsg.includes("SuperTokens core threw an error for a ") && errMsg.includes("with status code: 400")) {
            return {
                status: "INVALID_CONFIG_ERROR",
                message: errMsg.split(" and message: ")[1],
            };
        }
        throw err;
    }
    return {
        status: "OK",
    };
}
