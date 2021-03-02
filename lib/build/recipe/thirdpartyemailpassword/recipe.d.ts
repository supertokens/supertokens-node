import RecipeModule from "../../recipeModule";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import EmailVerificationRecipe from "../emailverification/recipe";
import EmailPasswordRecipe from "../emailpassword/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import * as express from "express";
import STError from "./error";
import { TypeInput, TypeNormalisedInput, User } from "./types";
import STErrorEmailPassword from "../emailpassword/error";
import STErrorThirdParty from "../thirdparty/error";
import NormalisedURLPath from "../../normalisedURLPath";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    emailVerificationRecipe: EmailVerificationRecipe;
    emailPasswordRecipe: EmailPasswordRecipe;
    thirdPartyRecipe: ThirdPartyRecipe | undefined;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeInput);
    static init(config: TypeInput): RecipeListFunction;
    static reset(): void;
    static getInstanceOrThrowError(): Recipe;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (id: string, req: express.Request, res: express.Response, next: express.NextFunction, path: NormalisedURLPath, method: HTTPMethod) => Promise<void>;
    handleError: (err: STErrorEmailPassword | STErrorThirdParty, request: express.Request, response: express.Response, next: express.NextFunction) => void;
    getAllCORSHeaders: () => string[];
    isErrorFromThisOrChildRecipeBasedOnInstance: (err: any) => err is STError;
    signUp: (email: string, password: string) => Promise<User>;
    signIn: (email: string, password: string) => Promise<User>;
    signInUp: (thirdPartyId: string, thirdPartyUserId: string, email: {
        id: string;
        isVerified: boolean;
    }) => Promise<{
        createdNewUser: boolean;
        user: User;
    }>;
    getUserById: (userId: string) => Promise<User | undefined>;
    getUserByThirdPartyInfo: (thirdPartyId: string, thirdPartyUserId: string) => Promise<User | undefined>;
    getEmailForUserId: (userId: string) => Promise<string>;
    getUserByEmail: (email: string) => Promise<User | undefined>;
    createResetPasswordToken: (userId: string) => Promise<string>;
    resetPasswordUsingToken: (token: string, newPassword: string) => Promise<void>;
    createEmailVerificationToken: (userId: string) => Promise<string>;
    verifyEmailUsingToken: (token: string) => Promise<import("../emailverification/types").User>;
    isEmailVerified: (userId: string) => Promise<boolean>;
    getUsersOldestFirst: (limit?: number | undefined, nextPaginationTokenString?: string | undefined) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    getUsersNewestFirst: (limit?: number | undefined, nextPaginationTokenString?: string | undefined) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    getUserCount: () => Promise<number>;
}
