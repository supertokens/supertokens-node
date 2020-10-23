import { Querier } from "./querier";
import STError from "./error";
import { NormalisedAppinfo, APIHandled, HTTPMethod } from "./types";
import * as express from "express";
export default abstract class RecipeModule {
    private recipeId;
    private querier;
    private appInfo;
    constructor(recipeId: string, appInfo: NormalisedAppinfo);
    getRecipeId: () => string;
    getAppInfo: () => NormalisedAppinfo;
    getQuerier: () => Querier;
    isErrorFromThisRecipe: (err: any) => err is STError;
    returnAPIIdIfCanHandleRequest: (path: string, method: HTTPMethod) => string | undefined;
    abstract getAPIsHandled(): APIHandled[];
    abstract handleAPIRequest(id: string, req: express.Request, response: express.Response, next: express.NextFunction): void;
    abstract handleError(error: STError, request: express.Request, response: express.Response, next: express.NextFunction): void;
}
