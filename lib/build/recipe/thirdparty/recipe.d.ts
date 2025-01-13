// @ts-nocheck
import RecipeModule from "../../recipeModule";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod, UserContext } from "../../types";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface, ProviderInput } from "./types";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
import type { BaseRequest, BaseResponse } from "../../framework";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: "thirdparty";
    config: TypeNormalisedInput;
    providers: ProviderInput[];
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput | undefined,
        _recipes: {},
        _ingredients: {}
    );
    static init(config?: TypeInput): RecipeListFunction;
    static getInstanceOrThrowError(): Recipe;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _path: NormalisedURLPath,
        _method: HTTPMethod,
        userContext: UserContext
    ) => Promise<boolean>;
    handleError: (err: STError, _request: BaseRequest, _response: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
}
