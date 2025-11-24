// @ts-nocheck
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
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type TypeNormalisedInput = {
    firstFactors?: string[];
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
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
        | ((input: { options: APIOptions; session: SessionContainerInterface; userContext: UserContext }) => Promise<
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
) =>
    | {
          status: "OK";
          factorIdToEmailsMap: Record<string, string[]>;
      }
    | {
          status: "UNKNOWN_SESSION_RECIPE_USER_ID";
      };
export type GetPhoneNumbersForFactorsFromOtherRecipesFunc = (
    user: User,
    sessionRecipeUserId: RecipeUserId
) =>
    | {
          status: "OK";
          factorIdToPhoneNumberMap: Record<string, string[]>;
      }
    | {
          status: "UNKNOWN_SESSION_RECIPE_USER_ID";
      };
export declare const FactorIds: {
    EMAILPASSWORD: string;
    WEBAUTHN: string;
    OTP_EMAIL: string;
    OTP_PHONE: string;
    LINK_EMAIL: string;
    LINK_PHONE: string;
    THIRDPARTY: string;
    TOTP: string;
};
