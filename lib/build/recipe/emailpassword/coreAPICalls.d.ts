import Recipe from "./recipe";
import { User } from "./types";
export declare function signUp(recipeInstance: Recipe, email: string, password: string): Promise<User>;
