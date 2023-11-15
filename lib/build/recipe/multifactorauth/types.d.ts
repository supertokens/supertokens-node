// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse } from "../../types";
import { User } from "../../user";
import { SessionContainer } from "../session";
import { SessionContainerInterface } from "../session/types";
import RecipeUserId from "../../recipeUserId";
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
        factorsSetUpByTheUser: string[];
        defaultRequiredFactorIdsForUser: string[];
        defaultRequiredFactorIdsForTenant: string[];
        completedFactors: Record<string, number>;
        userContext: any;
    }) => Promise<boolean>;
    getMFARequirementsForAuth: (input: {
        session: SessionContainer;
        factorsSetUpByTheUser: string[];
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
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
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
