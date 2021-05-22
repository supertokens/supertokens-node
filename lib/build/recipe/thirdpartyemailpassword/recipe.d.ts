import RecipeModule from "../../recipeModule";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import EmailVerificationRecipe from "../emailverification/recipe";
import * as express from "express";
import STError from "./error";
import { TypeInput, TypeNormalisedInput, User, RecipeInterface, APIInterface } from "./types";
import STErrorEmailPassword from "../emailpassword/error";
import STErrorThirdParty from "../thirdparty/error";
import NormalisedURLPath from "../../normalisedURLPath";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    emailVerificationRecipe: EmailVerificationRecipe;
    private emailPasswordRecipe;
    private thirdPartyRecipe;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config: TypeInput);
    static init(config: TypeInput): RecipeListFunction;
    static reset(): void;
    static getInstanceOrThrowError(): Recipe;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
        path: NormalisedURLPath,
        method: HTTPMethod
    ) => Promise<void>;
    handleError: (
        err: STErrorEmailPassword | STErrorThirdParty,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ) => void;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    getEmailForUserId: (userId: string) => Promise<string>;
    createEmailVerificationToken: (userId: string) => Promise<string>;
    verifyEmailUsingToken: (token: string) => Promise<User>;
    isEmailVerified: (userId: string) => Promise<boolean>;
}
