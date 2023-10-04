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
          params?: any;
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
    getMFARequirementsForSession?: (
        userId: string,
        recipeUserId: RecipeUserId,
        tenantId: string | undefined,
        userContext: any
    ) => Promise<MFARequirementList> | MFARequirementList;
    getMFARequirementsForFactorSetup?: (
        factorId: string,
        session: SessionContainer,
        tenantId: string | undefined,
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
    getMFARequirementsForSession: (
        userId: string,
        recipeUserId: RecipeUserId,
        tenantId: string | undefined,
        userContext: any
    ) => Promise<MFARequirementList> | MFARequirementList;
    getMFARequirementsForFactorSetup: (
        factorId: string,
        session: SessionContainer,
        tenantId: string | undefined,
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
    getFirstFactors: (input: { tenantId: string }) => Promise<string[]>;
    isAllowedToSetupFactor: (input: {
        tenantId: string;
        session: SessionContainerInterface;
        factorId: string;
        userContext: any;
    }) => Promise<boolean>;
    getFactorsSetupForUser: (input: { userId: string; userContext: any }) => Promise<string[]>;
    enableFactorForUser: (input: {
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
