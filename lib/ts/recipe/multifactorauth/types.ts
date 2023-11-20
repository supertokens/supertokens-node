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
import { GeneralErrorResponse } from "../../types";
import { User } from "../../user";
import { SessionContainer } from "../session";
import { SessionContainerInterface } from "../session/types";
import RecipeUserId from "../../recipeUserId";

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

export type MFAContext = {
    req: BaseRequest;
    res: BaseResponse;
    tenantId: string;
    factorIdInProgress: string;
    userAboutToSignIn?: User;
    session?: SessionContainerInterface;
    sessionUser?: User;
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
        userContext: any;
    }) => Promise<boolean>;

    getMFARequirementsForAuth: (input: {
        session: SessionContainer;
        factorsSetUpForUser: string[];
        defaultRequiredFactorIdsForUser: string[];
        defaultRequiredFactorIdsForTenant: string[];
        completedFactors: Record<string, number>;
        userContext: any;
    }) => Promise<MFARequirementList> | MFARequirementList;

    markFactorAsCompleteInSession: (input: {
        session: SessionContainerInterface;
        factorId: string;
        userContext?: any;
    }) => Promise<void>;

    getFactorsSetupForUser: (input: { user: User; tenantId: string; userContext: any }) => Promise<string[]>;

    getAllAvailableFactorIds: (input: { userContext: any }) => Promise<string[]>;

    addToDefaultRequiredFactorsForUser: (input: {
        user: User;
        tenantId: string;
        factorId: string;
        userContext: any;
    }) => Promise<void>;

    getDefaultRequiredFactorsForUser(input: { user: User; tenantId: string; userContext: any }): Promise<string[]>;

    createPrimaryUser: (input: {
        recipeUserId: RecipeUserId;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              user: User;
              wasAlreadyAPrimaryUser: boolean;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;

    linkAccounts: (input: {
        recipeUserId: RecipeUserId;
        primaryUserId: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              accountsAlreadyLinked: boolean;
              user: User;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              user: User;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
        | {
              status: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
          }
    >;

    checkAndCreateMFAContext: (input: {
        req: BaseRequest;
        res: BaseResponse;
        tenantId: string;
        factorIdInProgress: string;
        session?: SessionContainerInterface;
        sessionUser?: User;
        userAboutToSignIn?: User;
        userContext: any;
    }) => Promise<
        | ({ status: "OK" } & MFAContext)
        | {
              status: "DISALLOWED_FIRST_FACTOR_ERROR" | "FACTOR_SETUP_NOT_ALLOWED_ERROR";
          }
    >;

    createOrUpdateSession: (input: {
        justSignedInUser: User;
        justSignedInUserCreated: boolean;
        justSignedInRecipeUserId: RecipeUserId;
        mfaContext: MFAContext;
        userContext: any;
    }) => Promise<SessionContainerInterface>;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
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
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              factors: {
                  isAlreadySetup: string[];
                  isAllowedToSetup: string[];
              };
          }
        | GeneralErrorResponse
    >;
};

export type GetFactorsSetupForUserFromOtherRecipesFunc = (
    tenantId: string,
    user: User,
    userContext: any
) => Promise<string[]>;
