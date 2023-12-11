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
import { GeneralErrorResponse, JSONObject } from "../../types";
import { User } from "../../user";
import { SessionContainer } from "../session";
import { SessionContainerInterface } from "../session/types";
import Recipe from "./recipe";

export type MFARequirementList = (
    | {
          oneOf: string[];
      }
    | {
          allOf: string[];
      }
    | string
)[];

export type MFAClaimValue = {
    c: Record<string, number>;
    n: string[];
};

export type MFAFlowErrors = {
    status:
        | "DISALLOWED_FIRST_FACTOR_ERROR"
        | "FACTOR_SETUP_NOT_ALLOWED_ERROR"
        | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
        | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
        | "SESSION_USER_NOT_FOUND_ERROR";
    message?: string;
};

export type TypeInput = {
    firstFactors?: string[];

    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    firstFactors?: string[];

    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    isAllowedToSetupFactor: (input: {
        session: SessionContainer;
        factorId: string;
        mfaRequirementsForAuth: MFARequirementList;
        factorsSetUpForUser: string[];
        defaultRequiredFactorIdsForUser: string[];
        defaultRequiredFactorIdsForTenant: string[];
        completedFactors: Record<string, number>;
        userContext: Record<string, any>;
    }) => Promise<boolean>;

    getMFARequirementsForAuth: (input: {
        user: User;
        accessTokenPayload: JSONObject;
        tenantId: string;
        factorsSetUpForUser: string[];
        defaultRequiredFactorIdsForUser: string[];
        defaultRequiredFactorIdsForTenant: string[];
        completedFactors: Record<string, number>;
        userContext: Record<string, any>;
    }) => Promise<MFARequirementList> | MFARequirementList;

    markFactorAsCompleteInSession: (input: {
        session: SessionContainerInterface;
        factorId: string;
        userContext: Record<string, any>;
    }) => Promise<void>;

    getFactorsSetupForUser: (input: { user: User; userContext: Record<string, any> }) => Promise<string[]>;

    addToDefaultRequiredFactorsForUser: (input: {
        user: User;
        tenantId: string;
        factorId: string;
        userContext: Record<string, any>;
    }) => Promise<void>;

    getDefaultRequiredFactorsForUser(input: {
        user: User;
        tenantId: string;
        userContext: Record<string, any>;
    }): Promise<string[]>;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    recipeInstance: Recipe;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};

export type APIInterface = {
    mfaInfoGET: (input: {
        options: APIOptions;
        session: SessionContainerInterface;
        userContext: Record<string, any>;
    }) => Promise<
        | {
              status: "OK";
              factors: {
                  isAlreadySetup: string[];
                  isAllowedToSetup: string[];
              };
              email?: string;
              phoneNumber?: string;
          }
        | GeneralErrorResponse
    >;
};

export type GetFactorsSetupForUserFromOtherRecipesFunc = (
    user: User,
    userContext: Record<string, any>
) => Promise<string[]>;
