"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../../multitenancy/recipe"));
const utils_1 = require("../../multitenancy/utils");
const multifactorauth_1 = require("../../multifactorauth");
async function getTenantLoginMethodsInfo(_, __, ___, userContext) {
    const tenantsRes = await recipe_1.default
        .getInstanceOrThrowError()
        .recipeInterfaceImpl.listAllTenants({ userContext });
    const finalTenants = [];
    for (let i = 0; i < tenantsRes.tenants.length; i++) {
        const currentTenant = tenantsRes.tenants[i];
        const normalisedTenantLoginMethodsInfo = await normaliseTenantLoginMethodsWithInitConfig(
            {
                tenantId: currentTenant.tenantId,
                emailPassword: currentTenant.emailPassword,
                passwordless: currentTenant.passwordless,
                thirdParty: currentTenant.thirdParty,
                firstFactors: currentTenant.firstFactors,
            },
            userContext
        );
        finalTenants.push(normalisedTenantLoginMethodsInfo);
    }
    return {
        status: "OK",
        tenants: finalTenants,
    };
}
exports.default = getTenantLoginMethodsInfo;
async function normaliseTenantLoginMethodsWithInitConfig(tenantDetailsFromCore, userContext) {
    const normalisedTenantLoginMethodsInfo = {
        tenantId: tenantDetailsFromCore.tenantId,
        emailPassword: {
            enabled: false,
        },
        thirdPartyEmailPasssword: {
            enabled: false,
        },
        passwordless: {
            enabled: false,
        },
        thirdPartyPasswordless: {
            enabled: false,
        },
        thirdParty: {
            enabled: false,
        },
    };
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
        let validRes = await utils_1.isValidFirstFactor(tenantDetailsFromCore.tenantId, factorId, userContext);
        if (validRes.status === "OK") {
            validFirstFactors.push(factorId);
        }
        if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
            throw new Error("Tenant not found");
        }
    }
    if (validFirstFactors.includes(multifactorauth_1.FactorIds.EMAILPASSWORD)) {
        normalisedTenantLoginMethodsInfo.emailPassword.enabled = true;
    }
    if (validFirstFactors.includes(multifactorauth_1.FactorIds.THIRDPARTY)) {
        normalisedTenantLoginMethodsInfo.thirdParty.enabled = true;
    }
    const pwlessEmailEnabled =
        validFirstFactors.includes(multifactorauth_1.FactorIds.OTP_EMAIL) ||
        validFirstFactors.includes(multifactorauth_1.FactorIds.LINK_EMAIL);
    const pwlessPhoneEnabled =
        validFirstFactors.includes(multifactorauth_1.FactorIds.OTP_PHONE) ||
        validFirstFactors.includes(multifactorauth_1.FactorIds.LINK_PHONE);
    if (pwlessEmailEnabled) {
        if (pwlessPhoneEnabled) {
            normalisedTenantLoginMethodsInfo.passwordless.enabled = true;
            normalisedTenantLoginMethodsInfo.passwordless.contactMethod = "EMAIL_OR_PHONE";
        } else {
            normalisedTenantLoginMethodsInfo.passwordless.enabled = true;
            normalisedTenantLoginMethodsInfo.passwordless.contactMethod = "EMAIL";
        }
    } else if (pwlessPhoneEnabled) {
        normalisedTenantLoginMethodsInfo.passwordless.enabled = true;
        normalisedTenantLoginMethodsInfo.passwordless.contactMethod = "PHONE";
    }
    return normalisedTenantLoginMethodsInfo;
}
