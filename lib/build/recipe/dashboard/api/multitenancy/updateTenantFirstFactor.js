"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateTenantFirstFactor;
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const utils_1 = require("./utils");
async function updateTenantFirstFactor(_, tenantId, options, userContext) {
    const requestBody = await options.req.getJSONBody();
    const { factorId, enable } = requestBody;
    const mtRecipe = recipe_1.default.getInstance();
    if (enable === true) {
        if (
            !(mtRecipe === null || mtRecipe === void 0 ? void 0 : mtRecipe.allAvailableFirstFactors.includes(factorId))
        ) {
            return {
                status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK_ERROR",
                message: (0, utils_1.getFactorNotAvailableMessage)(factorId, mtRecipe.allAvailableFirstFactors),
            };
        }
    }
    const tenantRes = await (mtRecipe === null || mtRecipe === void 0
        ? void 0
        : mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext }));
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    let firstFactors = (0, utils_1.getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit)(tenantRes);
    if (enable === true) {
        if (!firstFactors.includes(factorId)) {
            firstFactors.push(factorId);
        }
    } else {
        firstFactors = firstFactors.filter((f) => f !== factorId);
    }
    await (mtRecipe === null || mtRecipe === void 0
        ? void 0
        : mtRecipe.recipeInterfaceImpl.createOrUpdateTenant({
              tenantId,
              config: {
                  firstFactors,
              },
              userContext,
          }));
    return {
        status: "OK",
    };
}
