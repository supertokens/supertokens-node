import { RecipeInterface, User } from "./types";
import {
    signUp as signUpAPIToCore,
    signIn as signInAPIToCore,
    getUserById as getUserByIdFromCore,
    getUserByEmail as getUserByEmailFromCore,
    createResetPasswordToken as createResetPasswordTokenFromCore,
    resetPasswordUsingToken as resetPasswordUsingTokenToCore,
    getUsersCount as getUsersCountCore,
    getUsers as getUsersCore,
} from "./coreAPICalls";
import Recipe from "./recipe";

export default class RecipeImplementation implements RecipeInterface {
    recipeInstance: Recipe;
    constructor(recipeInstance: Recipe) {
        this.recipeInstance = recipeInstance;
    }

    signUp = async (email: string, password: string): Promise<User> => {
        return signUpAPIToCore(this.recipeInstance, email, password);
    };

    signIn = async (email: string, password: string): Promise<User> => {
        return signInAPIToCore(this.recipeInstance, email, password);
    };

    getUserById = async (userId: string): Promise<User | undefined> => {
        return getUserByIdFromCore(this.recipeInstance, userId);
    };

    getUserByEmail = async (email: string): Promise<User | undefined> => {
        return getUserByEmailFromCore(this.recipeInstance, email);
    };

    createResetPasswordToken = async (userId: string): Promise<string> => {
        return createResetPasswordTokenFromCore(this.recipeInstance, userId);
    };

    resetPasswordUsingToken = async (token: string, newPassword: string) => {
        return resetPasswordUsingTokenToCore(this.recipeInstance, token, newPassword);
    };

    getUsersOldestFirst = async (limit?: number, nextPaginationToken?: string) => {
        return getUsersCore(this.recipeInstance, "ASC", limit, nextPaginationToken);
    };

    getUsersNewestFirst = async (limit?: number, nextPaginationToken?: string) => {
        return getUsersCore(this.recipeInstance, "DESC", limit, nextPaginationToken);
    };

    getUserCount = async (): Promise<number> => {
        return getUsersCountCore(this.recipeInstance);
    };
}
