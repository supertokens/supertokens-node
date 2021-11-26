// @ts-nocheck
import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
import { BaseRequest, BaseResponse } from "../../framework";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput | undefined
    );
    static getInstanceOrThrowError(): Recipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        _: string,
        __: BaseRequest,
        ___: BaseResponse,
        ____: NormalisedURLPath,
        _____: HTTPMethod
    ) => Promise<boolean>;
    handleError: (err: STError, _: BaseRequest, __: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
}
