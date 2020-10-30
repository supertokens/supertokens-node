import Recipe from "./recipe";
import { User } from "./types";
export declare function signUp(recipeInstance: Recipe, email: string, password: string): Promise<User>;
export declare function signIn(recipeInstance: Recipe, email: string, password: string): Promise<User>;
export declare function getUserById(recipeInstance: Recipe, userId: string): Promise<User | undefined>;
export declare function getUserByEmail(recipeInstance: Recipe, email: string): Promise<User | undefined>;
export declare function createResetPasswordToken(recipeInstance: Recipe, userId: string): Promise<string>;
