import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, JSONObject, UserContext } from "../../types";
import { User } from "../../user";
import { SessionContainer } from "../session";
import { SessionContainerInterface } from "../session/types";
import Recipe from "./recipe";
import { TenantConfig } from "../multitenancy/types";
import RecipeUserId from "../../recipeUserId";
export declare type MFARequirementList = ({
    oneOf: string[];
} | {
    allOfInAnyOrder: string[];
} | string)[];
export declare type MFAClaimValue = {
    c: Record<string, number> | undefined;
    v: boolean;
};
export declare type TypeInput = {
    firstFactors?: string[];
    override?: {
        functions?: (originalImplementation: RecipeInterface, builder?: OverrideableBuilder<RecipeInterface>) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    firstFactors?: string[];
    override: {
        functions: (originalImplementation: RecipeInterface, builder?: OverrideableBuilder<RecipeInterface>) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    assertAllowedToSetupFactorElseThrowInvalidClaimError: (input: {
        session: SessionContainer;
        factorId: string;
        mfaRequirementsForAuth: MFARequirementList;
        factorsSetUpForUser: string[];
        requiredSecondaryFactorsForUser: string[];
        requiredSecondaryFactorsForTenant: string[];
        completedFactors: Record<string, number>;
        userContext: UserContext;
    }) => Promise<void>;
    getMFARequirementsForAuth: (input: {
        user: User;
        accessTokenPayload: JSONObject;
        tenantId: string;
        factorsSetUpForUser: string[];
        requiredSecondaryFactorsForUser: string[];
        requiredSecondaryFactorsForTenant: string[];
        completedFactors: Record<string, number>;
        userContext: UserContext;
    }) => Promise<MFARequirementList> | MFARequirementList;
    markFactorAsCompleteInSession: (input: {
        session: SessionContainerInterface;
        factorId: string;
        userContext: UserContext;
    }) => Promise<void>;
    getFactorsSetupForUser: (input: {
        tenantId: string;
        user: User;
        userContext: UserContext;
    }) => Promise<string[]>;
    getRequiredSecondaryFactorsForUser: (input: {
        userId: string;
        userContext: UserContext;
    }) => Promise<string[]>;
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
    resyncSessionAndFetchMFAInfoPUT: undefined | ((input: {
        options: APIOptions;
        session: SessionContainerInterface;
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
        factors: {
            next: string[];
            isAlreadySetup: string[];
            isAllowedToSetup: string[];
        };
        emails: Record<string, string[] | undefined>;
        phoneNumbers: Record<string, string[] | undefined>;
    } | GeneralErrorResponse>);
};
export declare type GetFactorsSetupForUserFromOtherRecipesFunc = (tenantId: string, user: User, userContext: UserContext) => Promise<string[]>;
export declare type GetAllFactorsFromOtherRecipesFunc = (tenantConfig: TenantConfig) => string[];
export declare type GetEmailsForFactorFromOtherRecipesFunc = (user: User, sessionRecipeUserId: RecipeUserId) => {
    status: "OK";
    factorIdToEmailsMap: Record<string, string[]>;
} | {
    status: "UNKNOWN_SESSION_RECIPE_USER_ID";
};
export declare type GetPhoneNumbersForFactorsFromOtherRecipesFunc = (user: User, sessionRecipeUserId: RecipeUserId) => {
    status: "OK";
    factorIdToPhoneNumberMap: Record<string, string[]>;
} | {
    status: "UNKNOWN_SESSION_RECIPE_USER_ID";
};
