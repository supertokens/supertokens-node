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
import { GeneralErrorResponse, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";

export type TypeInput = {
    getAllowedDomainsForTenantId?: (tenantId: string, userContext: UserContext) => Promise<string[] | undefined>;

    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    getAllowedDomainsForTenantId?: (tenantId: string, userContext: UserContext) => Promise<string[] | undefined>;

    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TenantConfig = {
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
    coreConfig: { [key: string]: any };
};

export type RecipeInterface = {
    getTenantId: (input: { tenantIdFromFrontend: string; userContext: UserContext }) => Promise<string>;

    // Tenant management
    createOrUpdateTenant: (input: {
        tenantId: string;
        config?: {
            emailPasswordEnabled?: boolean;
            passwordlessEnabled?: boolean;
            thirdPartyEnabled?: boolean;
            firstFactors?: string[];
            requiredSecondaryFactors?: string[];
            coreConfig?: { [key: string]: any };
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
        tenants: (TenantConfig & { tenantId: string })[];
    }>;

    // Third party provider management
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

    // User tenant association
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

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    staticThirdPartyProviders: ProviderInput[];
    allAvailableFactors: string[];
    staticFirstFactors: string[] | undefined;
};

export type APIInterface = {
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
                  providers: { id: string; name?: string }[];
              };
              firstFactors: string[];
          }
        | GeneralErrorResponse
    >;
};
