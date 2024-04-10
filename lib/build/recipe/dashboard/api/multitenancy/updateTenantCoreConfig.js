"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
async function updateTenantCoreConfig(_, tenantId, options, userContext) {
    const requestBody = await options.req.getJSONBody();
    const { name, value } = requestBody;
    const mtRecipe = recipe_1.default.getInstance();
    const tenantRes = await mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext });
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    await mtRecipe.recipeInterfaceImpl.createOrUpdateTenant({
        tenantId,
        config: {
            coreConfig: {
                [name]: value,
            },
        },
        userContext,
    });
    return {
        status: "OK",
    };
}
exports.default = updateTenantCoreConfig;
