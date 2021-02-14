import RecipeModule from "../../recipeModule";
import { NormalisedAppinfo, APIHandled, RecipeListFunction } from "../../types";
import { TypeInput, TypeNormalisedInput, User, TypeProvider } from "./types";
import EmailVerificationRecipe from "../emailverification/recipe";
import * as express from "express";
import STError from "./error";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    emailVerificationRecipe: EmailVerificationRecipe;
    providers: TypeProvider[];
    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeInput);
    static init(config: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (id: string, req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
    handleError: (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => void;
    getAllCORSHeaders: () => string[];
    getUserById: (userId: string) => Promise<User | undefined>;
    getUserByThirdPartyInfo: (thirdPartyId: string, thirdPartyUserId: string) => Promise<User | undefined>;
    getEmailForUserId: (userId: string) => Promise<string>;
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
    signInUp: (thirdPartyId: string, thirdPartyUserId: string, email: {
        id: string;
        isVerified: boolean;
    }) => Promise<{
        createdNewUser: boolean;
        user: User;
    }>;
    static getInstanceOrThrowError(): Recipe;
}
