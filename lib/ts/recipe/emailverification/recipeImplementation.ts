import { RecipeInterface, User } from "./types";
import Recipe from "./recipe";
import {
    createEmailVerificationToken as createEmailVerificationTokenFromCore,
    verifyEmailUsingToken as verifyEmailUsingTokenFromCore,
    isEmailVerified as isEmailVerifiedFromCore,
} from "./coreAPICalls";

export default class RecipeImplementation implements RecipeInterface {
    recipeInstance: Recipe;
    constructor(recipeInstance: Recipe) {
        this.recipeInstance = recipeInstance;
    }

    createEmailVerificationToken = async (userId: string, email: string): Promise<string> => {
        return createEmailVerificationTokenFromCore(this.recipeInstance, userId, email);
    };

    verifyEmailUsingToken = async (token: string): Promise<User> => {
        return verifyEmailUsingTokenFromCore(this.recipeInstance, token);
    };

    isEmailVerified = async (userId: string, email: string) => {
        return isEmailVerifiedFromCore(this.recipeInstance, userId, email);
    };
}
