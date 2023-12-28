// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import STError from "../../error";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import {
    APIInterface,
    GetAllFactorsFromOtherRecipesFunc,
    GetEmailsForFactorFromOtherRecipesFunc,
    GetFactorsSetupForUserFromOtherRecipesFunc,
    GetPhoneNumbersForFactorsFromOtherRecipesFunc,
    RecipeInterface,
    TypeInput,
    TypeNormalisedInput,
} from "./types";
import { User } from "../../user";
import { SessionContainerInterface } from "../session/types";
import RecipeUserId from "../../recipeUserId";
import { Querier } from "../../querier";
import { TenantConfig } from "../multitenancy/types";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    getFactorsSetupForUserFromOtherRecipesFuncs: GetFactorsSetupForUserFromOtherRecipesFunc[];
    getAllFactorsFromOtherRecipesFunc: GetAllFactorsFromOtherRecipesFunc[];
    getEmailsForFactorFromOtherRecipesFunc: GetEmailsForFactorFromOtherRecipesFunc[];
    getPhoneNumbersForFactorFromOtherRecipesFunc: GetPhoneNumbersForFactorsFromOtherRecipesFunc[];
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    querier: Querier;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput);
    static getInstanceOrThrowError(): Recipe;
    static getInstance(): Recipe | undefined;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        _tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _: NormalisedURLPath,
        __: HTTPMethod,
        userContext: UserContext
    ) => Promise<boolean>;
    handleError: (err: STError, _: BaseRequest, __: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    addGetAllFactorsFromOtherRecipesFunc: (f: GetAllFactorsFromOtherRecipesFunc) => void;
    getAllAvailableFactorIds: (tenantConfig: TenantConfig) => string[];
    getAllAvailableFirstFactorIds: (tenantConfig: TenantConfig) => string[];
    addGetFactorsSetupForUserFromOtherRecipes: (func: GetFactorsSetupForUserFromOtherRecipesFunc) => void;
    validateForMultifactorAuthBeforeFactorCompletion: (
        input: {
            tenantId: string;
            factorIdInProgress: string;
            session?: SessionContainerInterface;
            userContext: UserContext;
        } & (
            | {
                  userSigningInForFactor: User;
              }
            | {
                  isAlreadySetup: boolean;
                  signUpInfo?: {
                      email?: string;
                      phoneNumber?: string;
                      isVerifiedFactor: boolean;
                  };
              }
        )
    ) => Promise<
        | {
              status: "OK";
          }
        | {
              status:
                  | "INVALID_FIRST_FACTOR_ERROR"
                  | "UNRELATED_USER_SIGN_IN_ERROR"
                  | "EMAIL_NOT_VERIFIED_ERROR"
                  | "PHONE_NUMBER_NOT_VERIFIED_ERROR"
                  | "SESSION_USER_CANNOT_BECOME_PRIMARY_ERROR"
                  | "CANNOT_LINK_FACTOR_ACCOUNT_ERROR"
                  | "FACTOR_SETUP_DISALLOWED_FOR_USER_ERROR"
                  | "RECURSE_FOR_RACE";
          }
    >;
    updateSessionAndUserAfterFactorCompletion: ({
        session,
        isFirstFactor,
        factorId,
        userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor,
        userContext,
    }: {
        session: SessionContainerInterface;
        isFirstFactor: boolean;
        factorId: string;
        userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor?:
            | {
                  user: User;
                  createdNewUser: boolean;
                  recipeUserId: RecipeUserId;
              }
            | undefined;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
          }
        | {
              status: "RECURSE_FOR_RACE";
          }
    >;
    getReasonForStatus: (
        status:
            | "INVALID_FIRST_FACTOR_ERROR"
            | "UNRELATED_USER_SIGN_IN_ERROR"
            | "EMAIL_NOT_VERIFIED_ERROR"
            | "PHONE_NUMBER_NOT_VERIFIED_ERROR"
            | "SESSION_USER_CANNOT_BECOME_PRIMARY_ERROR"
            | "CANNOT_LINK_FACTOR_ACCOUNT_ERROR"
            | "FACTOR_SETUP_DISALLOWED_FOR_USER_ERROR"
    ) =>
        | "This login method is not a valid first factor."
        | "The factor you are trying to complete is not setup with the current user account. Please contact support. (ERR_CODE_009)"
        | "The factor setup is not allowed because the email is not verified. Please contact support. (ERR_CODE_010)"
        | "The factor setup is not allowed because the phone number is not verified. Please contact support. (ERR_CODE_011)"
        | "Cannot setup factor because there is another account with same email or phone number. Please contact support. (ERR_CODE_012)"
        | "Factor setup was disallowed due to security reasons. Please contact support. (ERR_CODE_013)";
    addGetEmailsForFactorFromOtherRecipes: (func: GetEmailsForFactorFromOtherRecipesFunc) => void;
    getEmailsForFactors: (user: User, sessionRecipeUserId: RecipeUserId) => Record<string, string[] | undefined>;
    addGetPhoneNumbersForFactorsFromOtherRecipes: (func: GetPhoneNumbersForFactorsFromOtherRecipesFunc) => void;
    getPhoneNumbersForFactors: (user: User, sessionRecipeUserId: RecipeUserId) => Record<string, string[] | undefined>;
}
