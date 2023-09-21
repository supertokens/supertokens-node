// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { ProviderConfig, ProviderInput } from "../thirdparty/types";
import { GeneralErrorResponse } from "../../types";
import RecipeUserId from "../../recipeUserId";
export declare type TypeInput = {
    getAllowedDomainsForTenantId?: (tenantId: string, userContext: any) => Promise<string[] | undefined>;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    getAllowedDomainsForTenantId?: (tenantId: string, userContext: any) => Promise<string[] | undefined>;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    getTenantId: (input: { tenantIdFromFrontend: string; userContext: any }) => Promise<string>;
    createOrUpdateTenant: (input: {
        tenantId: string;
        config?: {
            emailPasswordEnabled?: boolean;
            passwordlessEnabled?: boolean;
            thirdPartyEnabled?: boolean;
            coreConfig?: {
                [key: string]: any;
            };
        };
        userContext: any;
    }) => Promise<{
        status: "OK";
        createdNew: boolean;
    }>;
    deleteTenant: (input: {
        tenantId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        didExist: boolean;
    }>;
    getTenant: (input: {
        tenantId: string;
        userContext: any;
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
                  providers: ProviderConfig[];
              };
              coreConfig: {
                  [key: string]: any;
              };
          }
        | undefined
    >;
    listAllTenants: (input: {
        userContext: any;
    }) => Promise<{
        status: "OK";
        tenants: {
            tenantId: string;
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
        }[];
    }>;
    createOrUpdateThirdPartyConfig: (input: {
        tenantId: string;
        config: ProviderConfig;
        skipValidation?: boolean;
        userContext: any;
    }) => Promise<{
        status: "OK";
        createdNew: boolean;
    }>;
    deleteThirdPartyConfig: (input: {
        tenantId: string;
        thirdPartyId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        didConfigExist: boolean;
    }>;
    associateUserToTenant: (input: {
        tenantId: string;
        recipeUserId: RecipeUserId;
        userContext: any;
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
        userContext: any;
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
};
export declare type APIInterface = {
    loginMethodsGET: (input: {
        tenantId: string;
        clientType?: string;
        options: APIOptions;
        userContext: any;
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
          }
        | GeneralErrorResponse
    >;
};
