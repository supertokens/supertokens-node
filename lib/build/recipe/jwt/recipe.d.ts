// @ts-nocheck
import error from "../../error";
import type { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import { APIInterface, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
export default class Recipe extends RecipeModule {
    static RECIPE_ID: "jwt";
    private static instance;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput);
    static getInstanceOrThrowError(): Recipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled(): APIHandled[];
    handleAPIRequest: (
        _id: string,
        _tenantId: string | undefined,
        req: BaseRequest,
        res: BaseResponse,
        _path: normalisedURLPath,
        _method: HTTPMethod,
        userContext: UserContext
    ) => Promise<boolean>;
    handleError(error: error, _: BaseRequest, __: BaseResponse, _userContext: UserContext): Promise<void>;
    getAllCORSHeaders(): string[];
    isErrorFromThisRecipe(err: any): err is error;
}
