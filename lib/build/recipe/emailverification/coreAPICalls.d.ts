import Recipe from "./recipe";
export declare function createEmailVerificationToken(recipeInstance: Recipe, userId: string, email: string): Promise<string>;
export declare function verifyEmailUsingToken(recipeInstance: Recipe, token: string): Promise<any>;
export declare function isEmailVerified(recipeInstance: Recipe, userId: string, email: string): Promise<boolean>;
