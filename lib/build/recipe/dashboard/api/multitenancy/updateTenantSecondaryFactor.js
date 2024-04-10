"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const recipe_2 = __importDefault(require("../../../multifactorauth/recipe"));
const multifactorauth_1 = require("../../../multifactorauth");
const utils_1 = require("./utils");
async function updateTenantSecondaryFactor(_, tenantId, options, userContext) {
    const requestBody = await options.req.getJSONBody();
    const { factorId, enable } = requestBody;
    const mtRecipe = recipe_1.default.getInstance();
    const mfaInstance = recipe_2.default.getInstance();
    if (mfaInstance === undefined) {
        return {
            status: "MFA_NOT_INITIALIZED",
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
    const allAvailableSecondaryFactors = mfaInstance.getAllAvailableSecondaryFactorIds(tenantRes);
    if (enable === true) {
        if (!allAvailableSecondaryFactors.includes(factorId)) {
            return {
                status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK",
                message: `No suitable recipe for the factor ${factorId} is initialised on the backend SDK`,
            };
        }
    }
    let secondaryFactors = utils_1.normaliseTenantSecondaryFactors(tenantRes);
    let updateTenantBody = {};
    if (enable === true) {
        if (!secondaryFactors.includes(factorId)) {
            secondaryFactors.push(factorId);
        }
        if ([multifactorauth_1.FactorIds.EMAILPASSWORD].includes(factorId)) {
            updateTenantBody.emailPasswordEnabled = true;
        } else if (
            [
                multifactorauth_1.FactorIds.LINK_EMAIL,
                multifactorauth_1.FactorIds.LINK_PHONE,
                multifactorauth_1.FactorIds.OTP_EMAIL,
                multifactorauth_1.FactorIds.OTP_PHONE,
            ].includes(factorId)
        ) {
            updateTenantBody.passwordlessEnabled = true;
        } else if ([multifactorauth_1.FactorIds.THIRDPARTY].includes(factorId)) {
            updateTenantBody.thirdPartyEnabled = true;
        }
    } else {
        secondaryFactors = secondaryFactors.filter((f) => f !== factorId);
    }
    await (mtRecipe === null || mtRecipe === void 0
        ? void 0
        : mtRecipe.recipeInterfaceImpl.createOrUpdateTenant({
              tenantId,
              config: Object.assign(Object.assign({}, updateTenantBody), {
                  requiredSecondaryFactors: secondaryFactors.length > 0 ? secondaryFactors : null,
              }),
              userContext,
          }));
    return {
        status: "OK",
        isMfaRequirementsForAuthOverridden: mfaInstance.isGetMfaRequirementsForAuthOverridden,
    };
}
exports.default = updateTenantSecondaryFactor;
