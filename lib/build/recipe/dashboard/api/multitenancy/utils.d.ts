// @ts-nocheck
import { TenantConfig } from "../../../multitenancy/types";
export declare function getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit(
    tenantDetailsFromCore: TenantConfig
): string[];
export declare function getNormalisedRequiredSecondaryFactorsBasedOnTenantConfigAndSDKInit(
    tenantDetailsFromCore: TenantConfig
): string[];
export declare function factorIdToRecipe(factorId: string): string;
