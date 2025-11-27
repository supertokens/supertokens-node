// @ts-nocheck
import type { TenantConfig } from "../../../multitenancy/types";
import type SuperTokens from "../../../../supertokens";
export declare function getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit(
    stInstance: SuperTokens,
    tenantDetailsFromCore: TenantConfig
): string[];
export declare function getNormalisedRequiredSecondaryFactorsBasedOnTenantConfigFromCoreAndSDKInit(
    stInstance: SuperTokens,
    tenantDetailsFromCore: TenantConfig
): string[];
export declare function factorIdToRecipe(factorId: string): string;
export declare function getFactorNotAvailableMessage(factorId: string, availableFactors: string[]): string;
