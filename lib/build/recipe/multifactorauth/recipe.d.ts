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
    addGetEmailsForFactorFromOtherRecipes: (func: GetEmailsForFactorFromOtherRecipesFunc) => void;
    getEmailsForFactors: (user: User, sessionRecipeUserId: RecipeUserId) => Record<string, string[] | undefined>;
    addGetPhoneNumbersForFactorsFromOtherRecipes: (func: GetPhoneNumbersForFactorsFromOtherRecipesFunc) => void;
    getPhoneNumbersForFactors: (user: User, sessionRecipeUserId: RecipeUserId) => Record<string, string[] | undefined>;
}
