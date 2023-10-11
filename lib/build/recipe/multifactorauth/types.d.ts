// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse } from "../../types";
import { SessionContainer } from "../session";
import { SessionContainerInterface } from "../session/types";
export declare type MFARequirement =
    | {
          id: string;
      }
    | string;
export declare type MFARequirementList = (
    | {
          oneOf: MFARequirement[];
      }
    | {
          allOf: MFARequirement[];
      }
    | MFARequirement
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
        requirementsForAuth: MFARequirementList;
        factorsSetUpByTheUser: string[];
        defaultRequiredFactorsForUser: string[];
        defaultRequiredFactorsForTenant: string[];
        completedFactors: Record<string, number>;
        userContext: any;
    }) => Promise<boolean>;
    getMFARequirementsForAuth: (input: {
        session: SessionContainer;
        factorsSetUpByTheUser: string[];
        defaultRequiredFactorsForUser: string[];
        defaultRequiredFactorsForTenant: string[];
        completedFactors: Record<string, number>;
        userContext: any;
    }) => Promise<MFARequirementList> | MFARequirementList;
    markFactorAsCompleteInSession: (input: {
        session: SessionContainerInterface;
        factor: string;
        userContext?: any;
    }) => Promise<void>;
    getFactorsSetupForUser: (input: { userId: string; tenantId: string; userContext: any }) => Promise<string[]>;
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
