// @ts-nocheck
import STError from "../../error";
import type { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import { APIInterface, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
export default class OpenIdRecipe extends RecipeModule {
    static RECIPE_ID: "openid";
    private static instance;
    config: TypeNormalisedInput;
    recipeImplementation: RecipeInterface;
    apiImpl: APIInterface;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, config?: TypeInput);
    static getInstanceOrThrowError(): OpenIdRecipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    static getIssuer(userContext: UserContext): Promise<string>;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        _tenantId: string,
        req: BaseRequest,
        response: BaseResponse,
        _path: normalisedURLPath,
        _method: HTTPMethod,
        userContext: UserContext
    ) => Promise<boolean>;
    handleError: (error: STError) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
}
