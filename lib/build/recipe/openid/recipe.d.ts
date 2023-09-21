// @ts-nocheck
import STError from "../../error";
import type { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from "../../types";
import { APIInterface, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import JWTRecipe from "../jwt/recipe";
export default class OpenIdRecipe extends RecipeModule {
    static RECIPE_ID: string;
    private static instance;
    config: TypeNormalisedInput;
    jwtRecipe: JWTRecipe;
    recipeImplementation: RecipeInterface;
    apiImpl: APIInterface;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput);
    static getInstanceOrThrowError(): OpenIdRecipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        tenantId: string,
        req: BaseRequest,
        response: BaseResponse,
        path: normalisedURLPath,
        method: HTTPMethod,
        userContext: any
    ) => Promise<boolean>;
    handleError: (error: STError, request: BaseRequest, response: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
}
