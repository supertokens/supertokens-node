import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import * as express from "express";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
import EmailVerificationRecipe from "../emailverification/recipe";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    emailVerificationRecipe: EmailVerificationRecipe;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput | undefined,
        recipes: {
            emailVerificationInstance: EmailVerificationRecipe | undefined;
        }
    );
    static getInstanceOrThrowError(): Recipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
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
        err: STError,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ) => void;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    getEmailForUserId: (userId: string) => Promise<string>;
    createEmailVerificationToken: (userId: string) => Promise<string>;
    verifyEmailUsingToken: (token: string) => Promise<import("./types").User>;
    isEmailVerified: (userId: string) => Promise<boolean>;
    revokeEmailVerificationTokens: (userId: string) => Promise<void>;
    unverifyEmail: (userId: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<import("./types").User>;
    signIn: (email: string, password: string) => Promise<import("./types").User>;
    createResetPasswordToken: (userId: string) => Promise<string>;
    resetPasswordUsingToken: (token: string, newPassword: string) => Promise<void>;
    updateEmailOrPassword: (input: {
        userId: string;
        email?: string | undefined;
        password?: string | undefined;
    }) => Promise<void>;
}
