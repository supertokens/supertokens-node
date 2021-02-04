import Recipe from "./recipe";
import { User } from "./types";
export declare function createEmailVerificationToken(recipeInstance: Recipe, userId: string, email: string): Promise<string>;
export declare function verifyEmailUsingToken(recipeInstance: Recipe, token: string): Promise<User>;
export declare function isEmailVerified(recipeInstance: Recipe, userId: string, email: string): Promise<boolean>;
