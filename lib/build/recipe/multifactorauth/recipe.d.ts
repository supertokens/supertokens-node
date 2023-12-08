// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import STError from "../../error";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from "../../types";
import {
    APIInterface,
    GetFactorsSetupForUserFromOtherRecipesFunc,
    MFAFlowErrors,
    RecipeInterface,
    TypeInput,
    TypeNormalisedInput,
} from "./types";
import { User } from "../../user";
import { SessionContainerInterface } from "../session/types";
import RecipeUserId from "../../recipeUserId";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    private getFactorsSetupForUserFromOtherRecipesFuncs;
    private allAvailableFactorIds;
    private allAvailableFirstFactorIds;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
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
        userContext: any
    ) => Promise<boolean>;
    handleError: (err: STError, _: BaseRequest, __: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    addAvailableFactorIdsFromOtherRecipes: (factorIds: string[], firstFactorIds: string[]) => void;
    getAllAvailableFactorIds: () => string[];
    getAllAvailableFirstFactorIds: () => string[];
    addGetFactorsSetupForUserFromOtherRecipes: (func: GetFactorsSetupForUserFromOtherRecipesFunc) => void;
    getFactorsSetupForUser: (user: User, userContext: any) => Promise<string[]>;
    validateForMultifactorAuthBeforeFactorCompletion: ({
        tenantId,
        factorIdInProgress,
        session,
        userLoggingIn,
        isAlreadySetup,
        userContext,
    }: {
        req: BaseRequest;
        res: BaseResponse;
        tenantId: string;
        factorIdInProgress: string;
        session?: SessionContainerInterface | undefined;
        userLoggingIn?: User | undefined;
        isAlreadySetup?: boolean | undefined;
        userContext: any;
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
        userContext: any;
    }) => Promise<
        | MFAFlowErrors
        | {
              status: "OK";
              session: SessionContainerInterface;
          }
    >;
}
