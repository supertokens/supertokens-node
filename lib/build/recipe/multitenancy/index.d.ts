// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface, TenantConfig } from "./types";
import { ProviderConfig } from "../thirdparty/types";
import { AllowedDomainsClaim } from "./allowedDomainsClaim";
import RecipeUserId from "../../recipeUserId";
export default class Wrapper {
    static init: typeof Recipe.init;
    static createOrUpdateTenant(
        tenantId: string,
        config?: {
            firstFactors?: string[] | null;
            requiredSecondaryFactors?: string[] | null;
            coreConfig?: {
                [key: string]: any;
            };
        },
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        createdNew: boolean;
    }>;
    static deleteTenant(
        tenantId: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        didExist: boolean;
    }>;
    static getTenant(
        tenantId: string,
        userContext?: Record<string, any>
    ): Promise<
        | ({
              status: "OK";
          } & TenantConfig)
        | undefined
    >;
    static listAllTenants(userContext?: Record<string, any>): Promise<{
        status: "OK";
        tenants: ({
            tenantId: string;
        } & TenantConfig)[];
    }>;
    static createOrUpdateThirdPartyConfig(
        tenantId: string,
        config: ProviderConfig,
        skipValidation?: boolean,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        createdNew: boolean;
    }>;
    static deleteThirdPartyConfig(
        tenantId: string,
        thirdPartyId: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        didConfigExist: boolean;
    }>;
    static associateUserToTenant(
        tenantId: string,
        recipeUserId: RecipeUserId,
        userContext?: Record<string, any>
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
        | {
              status: "ASSOCIATION_NOT_ALLOWED_ERROR";
              reason: string;
          }
    >;
    static disassociateUserFromTenant(
        tenantId: string,
        recipeUserId: RecipeUserId,
        userContext?: Record<string, any>
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
export { AllowedDomainsClaim };
export type { RecipeInterface, APIOptions, APIInterface };
