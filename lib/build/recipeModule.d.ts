// @ts-nocheck
import STError from "./error";
import { NormalisedAppinfo, APIHandled, HTTPMethod } from "./types";
import NormalisedURLPath from "./normalisedURLPath";
import { BaseRequest, BaseResponse } from "./framework";
export default abstract class RecipeModule {
    private recipeId;
    private appInfo;
    constructor(recipeId: string, appInfo: NormalisedAppinfo);
    getRecipeId: () => string;
    getAppInfo: () => NormalisedAppinfo;
    returnAPIIdIfCanHandleRequest: (path: NormalisedURLPath, method: HTTPMethod) => string | undefined;
    abstract getAPIsHandled(): APIHandled[];
    abstract handleAPIRequest(
        id: string,
        req: BaseRequest,
        response: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod
    ): Promise<boolean>;
    abstract handleError(error: STError, request: BaseRequest, response: BaseResponse): Promise<void>;
    abstract getAllCORSHeaders(): string[];
    abstract isErrorFromThisRecipe(err: any): err is STError;
}
