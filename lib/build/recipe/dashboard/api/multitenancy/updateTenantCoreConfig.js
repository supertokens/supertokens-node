"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateTenantCoreConfig;
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
