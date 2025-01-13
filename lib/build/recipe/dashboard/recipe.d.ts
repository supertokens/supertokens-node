// @ts-nocheck
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import { APIInterface, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import NormalisedURLPath from "../../normalisedURLPath";
import type { BaseRequest, BaseResponse } from "../../framework";
import error from "../../error";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: "dashboard";
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput);
    static getInstanceOrThrowError(): Recipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        __: NormalisedURLPath,
        ___: HTTPMethod,
        userContext: UserContext
    ) => Promise<boolean>;
    handleError: (err: error, _: BaseRequest, __: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is error;
}
