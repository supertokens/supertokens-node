/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
import { GeneralErrorResponse, JSONObject, UserContext } from "../../types";
import { User } from "../../user";
import { SessionContainer } from "../session";
import { SessionContainerInterface } from "../session/types";
import Recipe from "./recipe";
import { TenantConfig } from "../multitenancy/types";
import RecipeUserId from "../../recipeUserId";

export type MFARequirementList = (
    | {
          oneOf: string[];
      }
    | {
          allOfInAnyOrder: string[];
      }
    | string
)[];

export type MFAClaimValue = {
    c: Record<string, number | undefined>;
    v: boolean;
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
    assertAllowedToSetupFactorElseThrowInvalidClaimError: (input: {
        session: SessionContainer;
        factorId: string;
        mfaRequirementsForAuth: Promise<MFARequirementList>;
        factorsSetUpForUser: Promise<string[]>;
        userContext: UserContext;
    }) => Promise<void>;

    getMFARequirementsForAuth: (input: {
        tenantId: string;
        accessTokenPayload: JSONObject;
        completedFactors: MFAClaimValue["c"];
        user: Promise<User>;
        factorsSetUpForUser: Promise<string[]>;
        requiredSecondaryFactorsForUser: Promise<string[]>;
        requiredSecondaryFactorsForTenant: Promise<string[]>;
        userContext: UserContext;
    }) => Promise<MFARequirementList> | MFARequirementList;

    markFactorAsCompleteInSession: (input: {
        session: SessionContainerInterface;
        factorId: string;
        userContext: UserContext;
    }) => Promise<void>;

    getFactorsSetupForUser: (input: { user: User; userContext: UserContext }) => Promise<string[]>;

    getRequiredSecondaryFactorsForUser: (input: { userId: string; userContext: UserContext }) => Promise<string[]>;

    addToRequiredSecondaryFactorsForUser: (input: {
        userId: string;
        factorId: string;
        userContext: UserContext;
    }) => Promise<void>;

    removeFromRequiredSecondaryFactorsForUser: (input: {
        userId: string;
        factorId: string;
        userContext: UserContext;
    }) => Promise<void>;
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
    resyncSessionAndFetchMFAInfoPUT:
        | undefined
        | ((input: {
              options: APIOptions;
              session: SessionContainerInterface;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    factors: {
                        next: string[];
                        alreadySetup: string[];
                        allowedToSetup: string[];
                    };
                    emails: Record<string, string[] | undefined>;
                    phoneNumbers: Record<string, string[] | undefined>;
                }
              | GeneralErrorResponse
          >);
};

export type GetFactorsSetupForUserFromOtherRecipesFunc = (user: User, userContext: UserContext) => Promise<string[]>;

export type GetAllAvailableSecondaryFactorIdsFromOtherRecipesFunc = (tenantConfig: TenantConfig) => string[];

export type GetEmailsForFactorFromOtherRecipesFunc = (
    user: User,
    sessionRecipeUserId: RecipeUserId
) => { status: "OK"; factorIdToEmailsMap: Record<string, string[]> } | { status: "UNKNOWN_SESSION_RECIPE_USER_ID" };
export type GetPhoneNumbersForFactorsFromOtherRecipesFunc = (
    user: User,
    sessionRecipeUserId: RecipeUserId
) =>
    | { status: "OK"; factorIdToPhoneNumberMap: Record<string, string[]> }
    | { status: "UNKNOWN_SESSION_RECIPE_USER_ID" };

export const FactorIds = {
    EMAILPASSWORD: "emailpassword",
    OTP_EMAIL: "otp-email",
    OTP_PHONE: "otp-phone",
    LINK_EMAIL: "link-email",
    LINK_PHONE: "link-phone",
    THIRDPARTY: "thirdparty",
    TOTP: "totp",
};
