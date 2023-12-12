// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, JSONObject } from "../../types";
import { User } from "../../user";
import { SessionContainer } from "../session";
import { SessionContainerInterface } from "../session/types";
import Recipe from "./recipe";
import { TenantConfig } from "../multitenancy/types";
export declare type MFARequirementList = (
    | {
          oneOf: string[];
      }
    | {
          allOf: string[];
      }
    | string
)[];
export declare type MFAClaimValue = {
    c: Record<string, number>;
    n: string[];
};
export declare type MFAFlowErrors = {
    status:
        | "DISALLOWED_FIRST_FACTOR_ERROR"
        | "FACTOR_SETUP_NOT_ALLOWED_ERROR"
        | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
        | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
    message?: string;
};
export declare type TypeInput = {
    firstFactors?: string[];
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    firstFactors?: string[];
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
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
    getFactorsSetupForUser: (input: {
        tenantId: string;
        user: User;
        userContext: Record<string, any>;
    }) => Promise<string[]>;
    addToDefaultRequiredFactorsForUser: (input: {
        user: User;
        factorId: string;
        userContext: Record<string, any>;
    }) => Promise<void>;
    getDefaultRequiredFactorsForUser(input: {
        user: User;
        tenantId: string;
        userContext: Record<string, any>;
    }): Promise<string[]>;
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    recipeInstance: Recipe;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export declare type APIInterface = {
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
export declare type GetFactorsSetupForUserFromOtherRecipesFunc = (
    user: User,
    tenantConfig: TenantConfig,
    userContext: Record<string, any>
) => Promise<string[]>;
