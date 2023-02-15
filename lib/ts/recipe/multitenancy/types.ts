/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

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

export type TypeInput = {
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

export type TypeNormalisedInput = {
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

export type RecipeInterface = {
    getTenantId: (input: { tenantIdFromFrontend?: string; userContext: any }) => Promise<string | undefined>;

    // Tenant management
    createOrUpdateTenant: (input: {
        tenantId?: string;
        config?: {
            emailPasswordEnabled?: boolean;
            passwordlessEnabled?: boolean;
            thirdPartyEnabled?: boolean;
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
        tenantExisted: boolean;
    }>;
    getTenantConfig: (input: {
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
    }>;
    listAllTenants: (input: {
        userContext: any;
    }) => Promise<{
        status: "OK";
        tenants: string[];
    }>;

    // Third party provider management
    createOrUpdateThirdPartyConfig: (input: {
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
    listThirdPartyConfigsForThirdPartyId: (input: {
        thirdPartyId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        providers: ProviderConfig[];
    }>;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    staticThirdPartyProviders: ProviderInput[];
};

export type APIInterface = {
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
                  providers: { id: string; name?: string }[];
              };
          }
        | GeneralErrorResponse
    >;
};
