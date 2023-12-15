// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import STError from "../../error";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import {
    APIInterface,
    GetAllFactorsFromOtherRecipesFunc,
    GetFactorsSetupForUserFromOtherRecipesFunc,
    MFAFlowErrors,
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
    validateForMultifactorAuthBeforeFactorCompletion: ({
        tenantId,
        factorIdInProgress,
        session,
        userLoggingIn,
        isAlreadySetup,
        signUpInfo,
        userContext,
    }: {
        req: BaseRequest;
        res: BaseResponse;
        tenantId: string;
        factorIdInProgress: string;
        session?: SessionContainerInterface | undefined;
        userLoggingIn?: User | undefined;
        isAlreadySetup?: boolean | undefined;
        signUpInfo?:
            | {
                  email: string;
                  isVerifiedFactor: boolean;
              }
            | undefined;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
          }
        | MFAFlowErrors
    >;
    createOrUpdateSessionForMultifactorAuthAfterFactorCompletion: ({
        req,
        res,
        tenantId,
        factorIdInProgress,
        justCompletedFactorUserInfo,
        userContext,
    }: {
        req: BaseRequest;
        res: BaseResponse;
        tenantId: string;
        factorIdInProgress: string;
        isAlreadySetup?: boolean | undefined;
        justCompletedFactorUserInfo?:
            | {
                  user: User;
                  createdNewUser: boolean;
                  recipeUserId: RecipeUserId;
              }
            | undefined;
        userContext: UserContext;
    }) => Promise<
        | MFAFlowErrors
        | {
              status: "OK";
              session: SessionContainerInterface;
          }
    >;
}
