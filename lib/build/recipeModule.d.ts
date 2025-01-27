// @ts-nocheck
import STError from "./error";
import { NormalisedAppinfo, APIHandled, HTTPMethod, UserContext } from "./types";
import NormalisedURLPath from "./normalisedURLPath";
import { BaseRequest, BaseResponse } from "./framework";
export default abstract class RecipeModule {
    private recipeId;
    protected appInfo: NormalisedAppinfo;
    constructor(recipeId: string, appInfo: NormalisedAppinfo);
    getRecipeId: () => string;
    getAppInfo: () => NormalisedAppinfo;
    returnAPIIdIfCanHandleRequest: (
        path: NormalisedURLPath,
        method: HTTPMethod,
        userContext: UserContext
    ) => Promise<
        | {
              id: string;
              tenantId: string;
              exactMatch: boolean;
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
        userContext: UserContext
    ): Promise<boolean>;
    abstract handleError(
        error: STError,
        request: BaseRequest,
        response: BaseResponse,
        userContext: UserContext
    ): Promise<void>;
    abstract getAllCORSHeaders(): string[];
    abstract isErrorFromThisRecipe(err: any): err is STError;
}
