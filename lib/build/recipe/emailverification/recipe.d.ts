import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import * as express from "express";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config: TypeInput);
    static getInstanceOrThrowError(): Recipe;
    static init(config: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (id: string, req: express.Request, res: express.Response, next: express.NextFunction, path: NormalisedURLPath, method: HTTPMethod) => Promise<void>;
    handleError: (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => void;
    getAllCORSHeaders: () => string[];
    isErrorFromThisOrChildRecipeBasedOnInstance: (err: any) => err is STError;
    createEmailVerificationToken: (userId: string, email: string) => Promise<string>;
    verifyEmailUsingToken: (token: string) => Promise<import("./types").User>;
    isEmailVerified: (userId: string, email: string) => Promise<boolean>;
}
