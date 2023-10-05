// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse } from "../../types";
import RecipeUserId from "../../recipeUserId";
import { SessionContainer } from "../session";
import { SessionContainerInterface } from "../session/types";
export declare type MFARequirement =
    | {
          id: string;
          maxAgeInSeconds?: number;
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
    getGlobalMFARequirements?: (
        userId: string,
        recipeUserId: RecipeUserId,
        tenantId: string,
        session: SessionContainer | undefined,
        enabledFactors: string[],
        completedFactors: Record<string, number>,
        userContext: any
    ) => Promise<MFARequirementList> | MFARequirementList;
    getMFARequirementsForFactorSetup?: (
        factorId: string,
        session: SessionContainer,
        userContext: any
    ) => Promise<MFARequirementList> | MFARequirementList;
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
    getGlobalMFARequirements: (
        userId: string,
        recipeUserId: RecipeUserId,
        tenantId: string,
        session: SessionContainer | undefined,
        enabledFactors: string[],
        completedFactors: Record<string, number>,
        userContext: any
    ) => Promise<MFARequirementList> | MFARequirementList;
    getMFARequirementsForFactorSetup: (
        factorId: string,
        session: SessionContainer,
        userContext: any
    ) => Promise<MFARequirementList> | MFARequirementList;
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
        tenantId: string;
        session: SessionContainerInterface;
        factorId: string;
        userContext: any;
    }) => Promise<boolean>;
    getFactorsSetupForUser: (input: { userId: string; tenantId: string; userContext: any }) => Promise<string[]>;
    enableFactorForUser: (input: {
        tenantId: string;
        userId: string;
        factorId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        newEnabledFactors: string[];
    }>;
    enableFactorForTenant: (input: {
        tenantId: string;
        factorId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        newEnabledFactors: string[];
    }>;
    getEnabledFactorsForUser: (input: {
        userId: string;
        tenantId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        enabledFactors: string[];
    }>;
    getEnabledFactorsForTenant: (input: {
        tenantId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        enabledFactors: string[];
    }>;
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
        tenantId: string;
        options: APIOptions;
        session: SessionContainerInterface;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              factors: {
                  canComplete: string[];
                  canSetup: string[];
              };
          }
        | GeneralErrorResponse
    >;
};
