import RecipeModule from "../../recipeModule";
import { TypeInput } from "./types";
import { NormalisedAppinfo, APIHandled } from "../../types";
import * as express from "express";
import STError from "./error";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, config?: TypeInput);
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (id: string, req: express.Request, res: express.Response, next: express.NextFunction) => void;
    handleError: (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => void;
    getAllCORSHeaders: () => string[];
}
