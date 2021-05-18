import { RecipeInterface, User } from "./types";
import Recipe from "./recipe";
export default class RecipeImplementation implements RecipeInterface {
    recipeInstance: Recipe;
    constructor(recipeInstance: Recipe);
    createEmailVerificationToken: (userId: string, email: string) => Promise<string>;
    verifyEmailUsingToken: (token: string) => Promise<User>;
    isEmailVerified: (userId: string, email: string) => Promise<boolean>;
}
