import { Querier } from "./querier";
import STError from "./error";
import { NormalisedAppinfo, APIHandled, HTTPMethod } from "./types";
import * as express from "express";
import NormalisedURLPath from "./normalisedURLPath";
export default abstract class RecipeModule {
    private recipeId;
    private querier;
    private appInfo;
    private isInServerlessEnv;
    private rIdToCore;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, rIdToCore?: string);
    getRecipeId: () => string;
    getAppInfo: () => NormalisedAppinfo;
    checkIfInServerlessEnv: () => boolean;
    getQuerier: () => Querier;
    isErrorFromThisRecipeBasedOnRid: (err: any) => err is STError;
    returnAPIIdIfCanHandleRequest: (path: NormalisedURLPath, method: HTTPMethod) => string | undefined;
    abstract isErrorFromThisOrChildRecipeBasedOnInstance(err: any): err is STError;
    abstract getAPIsHandled(): APIHandled[];
    abstract handleAPIRequest(id: string, req: express.Request, response: express.Response, next: express.NextFunction, path: NormalisedURLPath, method: HTTPMethod): Promise<void>;
    abstract handleError(error: STError, request: express.Request, response: express.Response, next: express.NextFunction): void;
    abstract getAllCORSHeaders(): string[];
}
