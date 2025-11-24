"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateTenantSecondaryFactor;
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const recipe_2 = __importDefault(require("../../../multifactorauth/recipe"));
const utils_1 = require("./utils");
async function updateTenantSecondaryFactor(_, tenantId, options, userContext) {
    const requestBody = await options.req.getJSONBody();
    const { factorId, enable } = requestBody;
    const mtRecipe = recipe_1.default.getInstance();
    const mfaInstance = recipe_2.default.getInstance();
    if (mfaInstance === undefined) {
        return {
            status: "MFA_NOT_INITIALIZED_ERROR",
        };
    }
    const tenantRes = await (mtRecipe === null || mtRecipe === void 0
        ? void 0
        : mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext }));
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    if (enable === true) {
        const allAvailableSecondaryFactors = mfaInstance.getAllAvailableSecondaryFactorIds(tenantRes);
        if (!allAvailableSecondaryFactors.includes(factorId)) {
            return {
                status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK_ERROR",
                message: (0, utils_1.getFactorNotAvailableMessage)(factorId, allAvailableSecondaryFactors),
            };
        }
    }
    let secondaryFactors = (0, utils_1.getNormalisedRequiredSecondaryFactorsBasedOnTenantConfigFromCoreAndSDKInit)(
        tenantRes
    );
    if (enable === true) {
        if (!secondaryFactors.includes(factorId)) {
            secondaryFactors.push(factorId);
        }
    } else {
        secondaryFactors = secondaryFactors.filter((f) => f !== factorId);
    }
    await (mtRecipe === null || mtRecipe === void 0
        ? void 0
        : mtRecipe.recipeInterfaceImpl.createOrUpdateTenant({
              tenantId,
              config: {
                  requiredSecondaryFactors: secondaryFactors.length > 0 ? secondaryFactors : null,
              },
              userContext,
          }));
    return {
        status: "OK",
        isMFARequirementsForAuthOverridden: mfaInstance.isGetMfaRequirementsForAuthOverridden,
    };
}
