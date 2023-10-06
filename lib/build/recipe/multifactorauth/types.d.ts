// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse } from "../../types";
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
    getMFARequirementsForAuth?: (
        session: SessionContainer | undefined,
        factorsSetUpByTheUser: string[],
        completedFactors: Record<string, number>,
        userContext: any
    ) => Promise<MFARequirementList> | MFARequirementList;
    getMFARequirementsForFactorSetup?: (
        factorId: string,
        session: SessionContainer,
        factorsSetUpByTheUser: string[],
        completedFactors: Record<string, number>,
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
    getMFARequirementsForAuth: (
        session: SessionContainer | undefined,
        factorsSetUpByTheUser: string[],
        completedFactors: Record<string, number>,
        userContext: any
    ) => Promise<MFARequirementList> | MFARequirementList;
    getMFARequirementsForFactorSetup: (
        factorId: string,
        session: SessionContainer,
        factorsSetUpByTheUser: string[],
        completedFactors: Record<string, number>,
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
        session: SessionContainerInterface;
        factorId: string;
        userContext: any;
    }) => Promise<boolean>;
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
                  canComplete: string[];
                  canSetup: string[];
              };
          }
        | GeneralErrorResponse
    >;
};
