// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { ProviderConfig, ProviderInput } from "../thirdparty/types";
import { GeneralErrorResponse, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";
export declare type TypeInput = {
    getAllowedDomainsForTenantId?: (tenantId: string, userContext: UserContext) => Promise<string[] | undefined>;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    getAllowedDomainsForTenantId?: (tenantId: string, userContext: UserContext) => Promise<string[] | undefined>;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TenantConfig = {
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
    firstFactors?: string[];
    requiredSecondaryFactors?: string[];
    coreConfig: {
        [key: string]: any;
    };
};
export declare type RecipeInterface = {
    getTenantId: (input: { tenantIdFromFrontend: string; userContext: UserContext }) => Promise<string>;
    createOrUpdateTenant: (input: {
        tenantId: string;
        config?: {
            emailPasswordEnabled?: boolean;
            passwordlessEnabled?: boolean;
            thirdPartyEnabled?: boolean;
            firstFactors?: string[];
            requiredSecondaryFactors?: string[];
            coreConfig?: {
                [key: string]: any;
            };
        };
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
        createdNew: boolean;
    }>;
    deleteTenant: (input: {
        tenantId: string;
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
        didExist: boolean;
    }>;
    getTenant: (input: {
        tenantId: string;
        userContext: UserContext;
    }) => Promise<
        | ({
              status: "OK";
          } & TenantConfig)
        | undefined
    >;
    listAllTenants: (input: {
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
        tenants: (TenantConfig & {
            tenantId: string;
        })[];
    }>;
    createOrUpdateThirdPartyConfig: (input: {
        tenantId: string;
        config: ProviderConfig;
        skipValidation?: boolean;
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
        createdNew: boolean;
    }>;
    deleteThirdPartyConfig: (input: {
        tenantId: string;
        thirdPartyId: string;
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
        didConfigExist: boolean;
    }>;
    associateUserToTenant: (input: {
        tenantId: string;
        recipeUserId: RecipeUserId;
        userContext: UserContext;
    }) => Promise<
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
    disassociateUserFromTenant: (input: {
        tenantId: string;
        recipeUserId: RecipeUserId;
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
        wasAssociated: boolean;
    }>;
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    staticThirdPartyProviders: ProviderInput[];
    allAvailableFirstFactors: string[];
    staticFirstFactors: string[] | undefined;
};
export declare type APIInterface = {
    loginMethodsGET: (input: {
        tenantId: string;
        clientType?: string;
        options: APIOptions;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              emailPassword: {
                  enabled: boolean;
              };
              passwordless: {
                  enabled: boolean;
              };
              thirdParty: {
                  enabled: boolean;
                  providers: {
                      id: string;
                      name?: string;
                  }[];
              };
              firstFactors: string[];
          }
        | GeneralErrorResponse
    >;
};
