import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, User } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction } from "../../types";
import * as express from "express";
import STError from "./error";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, config?: TypeInput);
    static getInstanceOrThrowError(): Recipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (id: string, req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
    handleError: (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => express.Response | undefined;
    getAllCORSHeaders: () => string[];
    signUp: (email: string, password: string) => Promise<User>;
}
