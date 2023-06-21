// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { ProviderConfig, ProviderInput } from "../thirdparty/types";
import { GeneralErrorResponse } from "../../types";
export interface TenantDoesNotExistErrorHandlerMiddleware {
    (message: string, request: BaseRequest, response: BaseResponse): Promise<void>;
}
export interface RecipeDisabledForTenantErrorHandlerMiddleware {
    (message: string, request: BaseRequest, response: BaseResponse): Promise<void>;
}
export interface ErrorHandlers {
    onTenantDoesNotExistError?: TenantDoesNotExistErrorHandlerMiddleware;
    onRecipeDisabledForTenantError?: RecipeDisabledForTenantErrorHandlerMiddleware;
}
export interface NormalisedErrorHandlers {
    onTenantDoesNotExistError: TenantDoesNotExistErrorHandlerMiddleware;
    onRecipeDisabledForTenantError: RecipeDisabledForTenantErrorHandlerMiddleware;
}
export declare type TypeInput = {
    getAllowedDomainsForTenantId?: (
        tenantId: string | undefined,
        userContext: any
    ) => Promise<{
        status: "OK";
        domains: string[];
    }>;
    errorHandlers?: ErrorHandlers;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    getAllowedDomainsForTenantId?: (
        tenantId: string | undefined,
        userContext: any
    ) => Promise<{
        status: "OK";
        domains: string[];
    }>;
    errorHandlers: NormalisedErrorHandlers;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    getTenantId: (input: { tenantIdFromFrontend?: string; userContext: any }) => Promise<string | undefined>;
    createOrUpdateTenant: (input: {
        tenantId?: string;
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
        tenantId?: string;
        userContext: any;
    }) => Promise<{
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
    listAllTenants: (input: {
        userContext: any;
    }) => Promise<{
        status: "OK";
        tenants: string[];
    }>;
    createOrUpdateThirdPartyConfig: (input: {
        tenantId?: string;
        config: ProviderConfig;
        skipValidation?: boolean;
        userContext: any;
    }) => Promise<{
        status: "OK";
        createdNew: boolean;
    }>;
    deleteThirdPartyConfig: (input: {
        tenantId?: string;
        thirdPartyId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        didConfigExist: boolean;
    }>;
    associateUserToTenant: (input: {
        tenantId?: string;
        userId: string;
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
    >;
    disassociateUserFromTenant: (input: {
        tenantId?: string;
        userId: string;
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
        tenantId?: string;
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
