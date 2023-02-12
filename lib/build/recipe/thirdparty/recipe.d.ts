// @ts-nocheck
import RecipeModule from "../../recipeModule";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import { TypeInput, TypeNormalisedInput, TypeProvider, RecipeInterface, APIInterface } from "./types";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
import { BaseRequest, BaseResponse } from "../../framework";
import { GetEmailForUserIdFunc } from "../emailverification/types";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    providers: TypeProvider[];
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        _recipes: {},
        _ingredients: {}
    );
    static init(config: TypeInput): RecipeListFunction;
    static getInstanceOrThrowError(): Recipe;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        req: BaseRequest,
        res: BaseResponse,
        _path: NormalisedURLPath,
        _method: HTTPMethod
    ) => Promise<boolean>;
    handleError: (err: STError, _request: BaseRequest, _response: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    getEmailForUserId: GetEmailForUserIdFunc;
}
