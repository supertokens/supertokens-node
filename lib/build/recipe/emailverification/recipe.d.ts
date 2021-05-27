import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface, User } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import * as express from "express";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config: TypeInput);
    static getInstanceOrThrowError(): Recipe;
    static init(config: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
        _: NormalisedURLPath,
        __: HTTPMethod
    ) => Promise<void>;
    handleError: (err: STError, _: express.Request, __: express.Response, next: express.NextFunction) => void;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    createEmailVerificationToken: (userId: string, email: string) => Promise<string>;
    verifyEmailUsingToken: (token: string) => Promise<User>;
    isEmailVerified: (userId: string, email: string) => Promise<boolean>;
}
