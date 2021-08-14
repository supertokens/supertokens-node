import { RecipeInterface, User } from "../../emailpassword/types";
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";

export default class RecipeImplementation implements RecipeInterface {
    recipeImplementation: ThirdPartyEmailPasswordRecipeInterface;

    constructor(recipeImplementation: ThirdPartyEmailPasswordRecipeInterface) {
        this.recipeImplementation = recipeImplementation;
    }

    signUp = async ({
        email,
        password,
    }: {
        email: string;
        password: string;
    }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> => {
        return await this.recipeImplementation.signUp({ email, password });
    };

    signIn = async ({
        email,
        password,
    }: {
        email: string;
        password: string;
    }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> => {
        return this.recipeImplementation.signIn({ email, password });
    };

    getUserById = async ({ userId }: { userId: string }): Promise<User | undefined> => {
        let user = await this.recipeImplementation.getUserById({ userId });
        if (user === undefined || user.thirdParty !== undefined) {
            // either user is undefined or it's a thirdparty user.
            return undefined;
        }
        return user;
    };

    getUserByEmail = async ({ email }: { email: string }): Promise<User | undefined> => {
        return this.recipeImplementation.getUserByEmail({ email });
    };

    createResetPasswordToken = async ({
        userId,
    }: {
        userId: string;
    }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID" }> => {
        return this.recipeImplementation.createResetPasswordToken({ userId });
    };

    resetPasswordUsingToken = async ({ token, newPassword }: { token: string; newPassword: string }) => {
        return this.recipeImplementation.resetPasswordUsingToken({ token, newPassword });
    };

    /**
     * @deprecated
     *   */
    getUsersOldestFirst = async (_: { limit?: number; nextPaginationToken?: string }) => {
        throw new Error("Should never be called");
    };

    /**
     * @deprecated
     *   */
    getUsersNewestFirst = async (_: { limit?: number; nextPaginationToken?: string }) => {
        throw new Error("Should never be called");
    };

    /**
     * @deprecated
     *   */
    getUserCount = async () => {
        throw new Error("Should never be called");
    };
}
