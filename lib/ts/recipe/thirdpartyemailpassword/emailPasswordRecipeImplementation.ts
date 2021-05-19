import { RecipeInterface, User } from "../emailpassword/types";
import STError from "./error";
import Recipe from "./recipe";

export default class RecipeImplementation implements RecipeInterface {
    recipeInstance: Recipe;

    constructor(recipeInstance: Recipe) {
        this.recipeInstance = recipeInstance;
    }

    signUp = async (email: string, password: string): Promise<User> => {
        return await this.recipeInstance.recipeInterfaceImpl.signUp(email, password);
    };

    signIn = async (email: string, password: string): Promise<User> => {
        return this.recipeInstance.recipeInterfaceImpl.signIn(email, password);
    };

    getUserById = async (userId: string): Promise<User | undefined> => {
        let user = await this.recipeInstance.recipeInterfaceImpl.getUserById(userId);
        if (user === undefined || user.thirdParty !== undefined) {
            // either user is undefined or it's a thirdparty user.
            return undefined;
        }
        return user;
    };

    getUserByEmail = async (email: string): Promise<User | undefined> => {
        return this.recipeInstance.recipeInterfaceImpl.getUserByEmail(email);
    };

    createResetPasswordToken = async (userId: string): Promise<string> => {
        return this.recipeInstance.recipeInterfaceImpl.createResetPasswordToken(userId);
    };

    resetPasswordUsingToken = async (token: string, newPassword: string) => {
        return this.recipeInstance.recipeInterfaceImpl.resetPasswordUsingToken(token, newPassword);
    };

    getUsersOldestFirst = async (_?: number, __?: string) => {
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Should never be called"),
            },
            this.recipeInstance
        );
    };

    getUsersNewestFirst = async (_?: number, __?: string) => {
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Should never be called"),
            },
            this.recipeInstance
        );
    };

    getUserCount = async () => {
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Should never be called"),
            },
            this.recipeInstance
        );
    };
}
