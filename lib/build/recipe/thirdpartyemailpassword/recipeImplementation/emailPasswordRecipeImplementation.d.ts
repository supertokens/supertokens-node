import { RecipeInterface, User } from "../../emailpassword/types";
import { RecipeInterface as ThirdPartyRecipeInterface } from "../types";
export default class RecipeImplementation implements RecipeInterface {
    recipeImplementation: ThirdPartyRecipeInterface;
    constructor(recipeImplementation: ThirdPartyRecipeInterface);
    signUp: (email: string, password: string) => Promise<User>;
    signIn: (email: string, password: string) => Promise<User>;
    getUserById: (userId: string) => Promise<User | undefined>;
    getUserByEmail: (email: string) => Promise<User | undefined>;
    createResetPasswordToken: (userId: string) => Promise<string>;
    resetPasswordUsingToken: (token: string, newPassword: string) => Promise<void>;
    getUsersOldestFirst: (_?: number | undefined, __?: string | undefined) => Promise<never>;
    getUsersNewestFirst: (_?: number | undefined, __?: string | undefined) => Promise<never>;
    getUserCount: () => Promise<never>;
}
