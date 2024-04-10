"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.normaliseTenantSecondaryFactors = exports.normaliseTenantLoginMethodsWithInitConfig = void 0;
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const recipe_2 = __importDefault(require("../../../multifactorauth/recipe"));
const utils_1 = require("../../../multitenancy/utils");
function normaliseTenantLoginMethodsWithInitConfig(tenantDetailsFromCore) {
    let firstFactors;
    let mtInstance = recipe_1.default.getInstanceOrThrowError();
    if (tenantDetailsFromCore.firstFactors !== undefined) {
        firstFactors = tenantDetailsFromCore.firstFactors; // highest priority, config from core
    } else if (mtInstance.staticFirstFactors !== undefined) {
        firstFactors = mtInstance.staticFirstFactors; // next priority, static config
    } else {
        // Fallback to all available factors (de-duplicated)
        firstFactors = Array.from(new Set(mtInstance.allAvailableFirstFactors));
    }
    // we now filter out all available first factors by checking if they are valid because
    // we want to return the ones that can work. this would be based on what recipes are enabled
    // on the core and also firstFactors configured in the core and supertokens.init
    // Also, this way, in the front end, the developer can just check for firstFactors for
    // enabled recipes in all cases irrespective of whether they are using MFA or not
    let validFirstFactors = [];
    for (const factorId of firstFactors) {
        if (
            utils_1.isFactorConfiguredForTenant({
                tenantConfig: tenantDetailsFromCore,
                allAvailableFirstFactors: mtInstance.allAvailableFirstFactors,
                firstFactors: firstFactors,
                factorId,
            })
        ) {
            validFirstFactors.push(factorId);
        }
    }
    return validFirstFactors;
}
exports.normaliseTenantLoginMethodsWithInitConfig = normaliseTenantLoginMethodsWithInitConfig;
function normaliseTenantSecondaryFactors(tenantDetailsFromCore) {
    const mfaInstance = recipe_2.default.getInstance();
    if (mfaInstance === undefined) {
        return [];
    }
    let secondaryFactors = mfaInstance.getAllAvailableSecondaryFactorIds(tenantDetailsFromCore);
    secondaryFactors = secondaryFactors.filter((factorId) => {
        var _a;
        return ((_a = tenantDetailsFromCore.requiredSecondaryFactors) !== null && _a !== void 0 ? _a : []).includes(
            factorId
        );
    });
    return secondaryFactors;
}
exports.normaliseTenantSecondaryFactors = normaliseTenantSecondaryFactors;
