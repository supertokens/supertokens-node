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
import RecipeUserId from "../../recipeUserId";
import { SessionContainer } from "../session";
import { SessionContainerInterface } from "../session/types";

export type MFARequirement =
    | {
          id: string;
          params?: any;
      }
    | string;

export type MFARequirementList = (
    | {
          oneOf: MFARequirement[];
      }
    | {
          allOf: MFARequirement[];
      }
    | MFARequirement
)[];

export type MFAClaimValue = {
    c: Record<string, number>;
    n: string[];
};

export type TypeInput = {
    firstFactors?: string[];

    getMFARequirementsForSession?: (userId: string, recipeUserId: RecipeUserId, tenantId: string | undefined, userContext: any) => MFARequirementList;

    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    getAllowedDomainsForTenantId?: (tenantId: string, userContext: any) => Promise<string[] | undefined>;

    getMFARequirementsForSession?: (userId: string, recipeUserId: RecipeUserId, tenantId: string | undefined, userContext: any) => MFARequirementList;

    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    enableFactorForUser: (input: { userId: string; factorId: string; userContext: any }) => Promise<{ enabledFactors: string[]}>;
    enableFactorForTenant: (input: { tenantId: string; factorId: string; userContext: any }) => Promise<{ enabledFactors: string[]}>;
    getEnabledFactorsForUser: (input: { userId: string; userContext: any }) => Promise<{ enabledFactors: string[]}>;
    getEnabledFactorsForTenant: (input: { tenantId: string; userContext: any }) => Promise<{ enabledFactors: string[]}>;
    completeFactorInSession: (input: { session: SessionContainerInterface, factorId: string; userContext: any}) => Promise<void>;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};

export type MFAInfo = {
    factorsAvailable: string[]; // Intersection of factors set up by user and enabled for user & tenant
    factorsEnabled: string[]; // Factors enabled for user and tenant
};

export type APIInterface = {
    mfaInfoGET: (input: {
        tenantId: string;
        options: APIOptions;
        session?: SessionContainerInterface;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              info: MFAInfo
          }
        | GeneralErrorResponse
    >;
};
