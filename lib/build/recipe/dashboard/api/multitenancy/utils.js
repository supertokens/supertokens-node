"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit =
    getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit;
exports.getNormalisedRequiredSecondaryFactorsBasedOnTenantConfigFromCoreAndSDKInit =
    getNormalisedRequiredSecondaryFactorsBasedOnTenantConfigFromCoreAndSDKInit;
exports.factorIdToRecipe = factorIdToRecipe;
exports.getFactorNotAvailableMessage = getFactorNotAvailableMessage;
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const recipe_2 = __importDefault(require("../../../multifactorauth/recipe"));
const utils_1 = require("../../../multitenancy/utils");
const multifactorauth_1 = require("../../../multifactorauth");
function getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit(tenantDetailsFromCore) {
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
            (0, utils_1.isFactorConfiguredForTenant)({
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
function getNormalisedRequiredSecondaryFactorsBasedOnTenantConfigFromCoreAndSDKInit(tenantDetailsFromCore) {
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
function factorIdToRecipe(factorId) {
    const factorIdToRecipe = {
        emailpassword: "Emailpassword",
        thirdparty: "ThirdParty",
        "otp-email": "Passwordless",
        "otp-phone": "Passwordless",
        "link-email": "Passwordless",
        "link-phone": "Passwordless",
        totp: "Totp",
        webauthn: "WebAuthn",
    };
    return factorIdToRecipe[factorId];
}
function getFactorNotAvailableMessage(factorId, availableFactors) {
    const recipeName = factorIdToRecipe(factorId);
    if (recipeName !== "Passwordless") {
        return `Please initialise ${recipeName} recipe to be able to use this login method`;
    }
    const passwordlessFactors = [
        multifactorauth_1.FactorIds.LINK_EMAIL,
        multifactorauth_1.FactorIds.LINK_PHONE,
        multifactorauth_1.FactorIds.OTP_EMAIL,
        multifactorauth_1.FactorIds.OTP_PHONE,
    ];
    const passwordlessFactorsNotAvailable = passwordlessFactors.filter((f) => !availableFactors.includes(f));
    if (passwordlessFactorsNotAvailable.length === 4) {
        return `Please initialise Passwordless recipe to be able to use this login method`;
    }
    const [flowType, contactMethod] = factorId.split("-");
    return `Please ensure that Passwordless recipe is initialised with contactMethod: ${contactMethod.toUpperCase()} and flowType: ${
        flowType === "otp" ? "USER_INPUT_CODE" : "MAGIC_LINK"
    }`;
}
