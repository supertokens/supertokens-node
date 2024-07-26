import MultitenancyRecipe from "../../../multitenancy/recipe";
import MultifactorAuthRecipe from "../../../multifactorauth/recipe";
import { isFactorConfiguredForTenant } from "../../../multitenancy/utils";
import type { TenantConfig } from "../../../multitenancy/types";
import { FactorIds } from "../../../multifactorauth";

export function getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit(
    tenantDetailsFromCore: TenantConfig
): string[] {
    let firstFactors: string[];

    let mtInstance = MultitenancyRecipe.getInstanceOrThrowError();
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
    let validFirstFactors: string[] = [];
    for (const factorId of firstFactors) {
        if (
            isFactorConfiguredForTenant({
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

export function getNormalisedRequiredSecondaryFactorsBasedOnTenantConfigFromCoreAndSDKInit(
    tenantDetailsFromCore: TenantConfig
): string[] {
    const mfaInstance = MultifactorAuthRecipe.getInstance();

    if (mfaInstance === undefined) {
        return [];
    }

    let secondaryFactors = mfaInstance.getAllAvailableSecondaryFactorIds(tenantDetailsFromCore);
    secondaryFactors = secondaryFactors.filter((factorId) =>
        (tenantDetailsFromCore.requiredSecondaryFactors ?? []).includes(factorId)
    );

    return secondaryFactors;
}

export function factorIdToRecipe(factorId: string): string {
    const factorIdToRecipe: Record<string, string> = {
        emailpassword: "Emailpassword",
        thirdparty: "ThirdParty",
        "otp-email": "Passwordless",
        "otp-phone": "Passwordless",
        "link-email": "Passwordless",
        "link-phone": "Passwordless",
        totp: "Totp",
    };

    return factorIdToRecipe[factorId];
}

export function getFactorNotAvailableMessage(factorId: string, availableFactors: string[]): string {
    const recipeName = factorIdToRecipe(factorId);
    if (recipeName !== "Passwordless") {
        return `Please initialise ${recipeName} recipe to be able to use this login method`;
    }

    const passwordlessFactors = [FactorIds.LINK_EMAIL, FactorIds.LINK_PHONE, FactorIds.OTP_EMAIL, FactorIds.OTP_PHONE];
    const passwordlessFactorsNotAvailable = passwordlessFactors.filter((f) => !availableFactors.includes(f));

    if (passwordlessFactorsNotAvailable.length === 4) {
        return `Please initialise Passwordless recipe to be able to use this login method`;
    }

    const [flowType, contactMethod] = factorId.split("-");
    return `Please ensure that Passwordless recipe is initialised with contactMethod: ${contactMethod.toUpperCase()} and flowType: ${
        flowType === "otp" ? "USER_INPUT_CODE" : "MAGIC_LINK"
    }`;
}
