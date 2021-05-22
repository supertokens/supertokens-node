import { RecipeInterface, User } from "../../emailpassword/types";
import STError from "../error";
import { RecipeInterface as ThirdPartyRecipeInterface } from "../types";

export default class RecipeImplementation implements RecipeInterface {
    recipeImplementation: ThirdPartyRecipeInterface;

    constructor(recipeImplementation: ThirdPartyRecipeInterface) {
        this.recipeImplementation = recipeImplementation;
    }

    signUp = async (email: string, password: string): Promise<User> => {
        return await this.recipeImplementation.signUp(email, password);
    };

    signIn = async (email: string, password: string): Promise<User> => {
        return this.recipeImplementation.signIn(email, password);
    };

    getUserById = async (userId: string): Promise<User | undefined> => {
        let user = await this.recipeImplementation.getUserById(userId);
        if (user === undefined || user.thirdParty !== undefined) {
            // either user is undefined or it's a thirdparty user.
            return undefined;
        }
        return user;
    };

    getUserByEmail = async (email: string): Promise<User | undefined> => {
        return this.recipeImplementation.getUserByEmail(email);
    };

    createResetPasswordToken = async (userId: string): Promise<string> => {
        return this.recipeImplementation.createResetPasswordToken(userId);
    };

    resetPasswordUsingToken = async (token: string, newPassword: string) => {
        return this.recipeImplementation.resetPasswordUsingToken(token, newPassword);
    };

    getUsersOldestFirst = async (_?: number, __?: string) => {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error("Should never be called"),
        });
    };

    getUsersNewestFirst = async (_?: number, __?: string) => {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error("Should never be called"),
        });
    };

    getUserCount = async () => {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error("Should never be called"),
        });
    };
}
