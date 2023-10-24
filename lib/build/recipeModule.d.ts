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
    returnAPIIdIfCanHandleRequest: (
        path: NormalisedURLPath,
        method: HTTPMethod,
        userContext: any
    ) => Promise<
        | {
              id: string;
              tenantId: string;
          }
        | undefined
    >;
    abstract getAPIsHandled(): APIHandled[];
    abstract handleAPIRequest(
        id: string,
        tenantId: string,
        req: BaseRequest,
        response: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod,
        userContext: any
    ): Promise<boolean>;
    abstract handleError(error: STError, request: BaseRequest, response: BaseResponse, userContext: any): Promise<void>;
    abstract getAllCORSHeaders(): string[];
    abstract isErrorFromThisRecipe(err: any): err is STError;
}
