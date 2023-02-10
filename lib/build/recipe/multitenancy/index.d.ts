// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface } from "./types";
import { ProviderConfig } from "../thirdparty/types";
import { RecipeDisabledForTenantError, TenantDoesNotExistError } from "./error";
import { AllowedDomainsClaim } from "./multitenancyClaim";
export default class Wrapper {
    static init: typeof Recipe.init;
    static createOrUpdateTenant(
        tenantId?: string,
        config?: {
            emailPasswordEnabled?: boolean;
            passwordlessEnabled?: boolean;
            thirdPartyEnabled: boolean;
        },
        userContext?: any
    ): Promise<{
        status: "OK";
        createdNew: boolean;
    }>;
    static deleteTenant(
        tenantId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        tenantExisted: boolean;
    }>;
    static getTenantConfig(
        tenantId?: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        emailPassword: {
            enabled: boolean;
        };
        passwordless: {
            enabled: boolean;
        };
        thirdParty: {
            enabled: boolean;
            providers: ProviderConfig[];
        };
    }>;
    static listAllTenants(
        userContext?: any
    ): Promise<{
        status: "OK";
        tenants: string[];
    }>;
    static createOrUpdateThirdPartyConfig(
        config: ProviderConfig,
        skipValidation?: boolean,
        userContext?: any
    ): Promise<{
        status: "OK";
        createdNew: boolean;
    }>;
    static deleteThirdPartyConfig(
        tenantId: string | undefined,
        thirdPartyId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        didConfigExist: boolean;
    }>;
    static listThirdPartyConfigsForThirdPartyId(
        thirdPartyId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        providers: ProviderConfig[];
    }>;
}
export declare let init: typeof Recipe.init;
export declare let createOrUpdateTenant: typeof Wrapper.createOrUpdateTenant;
export declare let deleteTenant: typeof Wrapper.deleteTenant;
export declare let getTenantConfig: typeof Wrapper.getTenantConfig;
export declare let listAllTenants: typeof Wrapper.listAllTenants;
export declare let createOrUpdateThirdPartyConfig: typeof Wrapper.createOrUpdateThirdPartyConfig;
export declare let deleteThirdPartyConfig: typeof Wrapper.deleteThirdPartyConfig;
export declare let listThirdPartyConfigsForThirdPartyId: typeof Wrapper.listThirdPartyConfigsForThirdPartyId;
export { RecipeDisabledForTenantError, TenantDoesNotExistError };
export { AllowedDomainsClaim };
export type { RecipeInterface, APIOptions, APIInterface };
