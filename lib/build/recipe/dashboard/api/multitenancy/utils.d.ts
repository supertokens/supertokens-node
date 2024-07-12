// @ts-nocheck
import { TenantConfig } from "../../../multitenancy/types";
export declare function getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit(
    tenantDetailsFromCore: TenantConfig
): string[];
export declare function getNormalisedRequiredSecondaryFactorsBasedOnTenantConfigFromCoreAndSDKInit(
    tenantDetailsFromCore: TenantConfig
): string[];
export declare function factorIdToRecipe(factorId: string): string;
export declare function getFactorNotAvailableMessage(factorId: string, availableFactors: string[]): string;
