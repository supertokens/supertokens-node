// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface } from "./types";
import { ProviderConfig } from "../thirdparty/types";
import { RecipeDisabledForTenantError, TenantDoesNotExistError } from "./error";
import { AllowedDomainsClaim } from "./allowedDomainsClaim";
export default class Wrapper {
    static init: typeof Recipe.init;
    static createOrUpdateTenant(
        tenantId?: string,
        config?: {
            emailPasswordEnabled?: boolean;
            passwordlessEnabled?: boolean;
            thirdPartyEnabled?: boolean;
            coreConfig?: {
                [key: string]: any;
            };
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
        didExist: boolean;
    }>;
    static getTenant(
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
        coreConfig: {
            [key: string]: any;
        };
    }>;
    static listAllTenants(
        userContext?: any
    ): Promise<{
        status: "OK";
        tenants: string[];
    }>;
    static createOrUpdateThirdPartyConfig(
        tenantId: string | undefined,
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
    static associateUserToTenant(
        tenantId: string | undefined,
        userId: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              wasAlreadyAssociated: boolean;
          }
        | {
              status:
                  | "UNKNOWN_USER_ID_ERROR"
                  | "EMAIL_ALREADY_EXISTS_ERROR"
                  | "PHONE_NUMBER_ALREADY_EXISTS_ERROR"
                  | "THIRD_PARTY_USER_ALREADY_EXISTS_ERROR";
          }
    >;
    static disassociateUserFromTenant(
        tenantId: string | undefined,
        userId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        wasAssociated: boolean;
    }>;
}
export declare let init: typeof Recipe.init;
export declare let createOrUpdateTenant: typeof Wrapper.createOrUpdateTenant;
export declare let deleteTenant: typeof Wrapper.deleteTenant;
export declare let getTenant: typeof Wrapper.getTenant;
export declare let listAllTenants: typeof Wrapper.listAllTenants;
export declare let createOrUpdateThirdPartyConfig: typeof Wrapper.createOrUpdateThirdPartyConfig;
export declare let deleteThirdPartyConfig: typeof Wrapper.deleteThirdPartyConfig;
export declare let associateUserToTenant: typeof Wrapper.associateUserToTenant;
export declare let disassociateUserFromTenant: typeof Wrapper.disassociateUserFromTenant;
export { RecipeDisabledForTenantError, TenantDoesNotExistError };
export { AllowedDomainsClaim };
export type { RecipeInterface, APIOptions, APIInterface };
