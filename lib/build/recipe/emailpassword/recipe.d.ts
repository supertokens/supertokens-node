import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, User } from "./types";
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
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput, rIdToCore?: string);
    getEmailForUserId: (userId: string) => Promise<string>;
    static getInstanceOrThrowError(): Recipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (id: string, req: express.Request, res: express.Response, next: express.NextFunction, path: NormalisedURLPath, method: HTTPMethod) => Promise<void>;
    handleError: (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => void;
    getAllCORSHeaders: () => string[];
    isErrorFromThisOrChildRecipeBasedOnInstance: (err: any) => err is STError;
    signUp: (email: string, password: string) => Promise<User>;
    signIn: (email: string, password: string) => Promise<User>;
    getUserById: (userId: string) => Promise<User | undefined>;
    getUserByEmail: (email: string) => Promise<User | undefined>;
    createResetPasswordToken: (userId: string) => Promise<string>;
    resetPasswordUsingToken: (token: string, newPassword: string) => Promise<void>;
    createEmailVerificationToken: (userId: string) => Promise<string>;
    verifyEmailUsingToken: (token: string) => Promise<import("../emailverification/types").User>;
    isEmailVerified: (userId: string) => Promise<boolean>;
    getUsersOldestFirst: (limit?: number | undefined, nextPaginationToken?: string | undefined) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    getUsersNewestFirst: (limit?: number | undefined, nextPaginationToken?: string | undefined) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    getUserCount: () => Promise<number>;
}
