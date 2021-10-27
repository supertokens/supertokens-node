import { RecipeInterface, User } from "../../emailpassword/types";
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";

export default function getRecipeInterface(recipeInterface: ThirdPartyEmailPasswordRecipeInterface): RecipeInterface {
    return {
        signUp: async function ({
            email,
            password,
        }: {
            email: string;
            password: string;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
            return await recipeInterface.signUp({ email, password });
        },

        signIn: async function ({
            email,
            password,
        }: {
            email: string;
            password: string;
        }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
            return recipeInterface.signIn({ email, password });
        },

        getUserById: async function ({ userId }: { userId: string }): Promise<User | undefined> {
            let user = await recipeInterface.getUserById({ userId });
            if (user === undefined || user.thirdParty !== undefined) {
                // either user is undefined or it's a thirdparty user.
                return undefined;
            }
            return user;
        },

        getUserByEmail: async function ({ email }: { email: string }): Promise<User | undefined> {
            let result = await recipeInterface.getUsersByEmail({ email });
            for (let i = 0; i < result.length; i++) {
                if (result[i].thirdParty === undefined) {
                    return result[i];
                }
            }
            return undefined;
        },

        createResetPasswordToken: async function ({
            userId,
        }: {
            userId: string;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            return recipeInterface.createResetPasswordToken({ userId });
        },

        resetPasswordUsingToken: async function ({ token, newPassword }: { token: string; newPassword: string }) {
            return recipeInterface.resetPasswordUsingToken({ token, newPassword });
        },

        updateEmailOrPassword: async function (input: {
            userId: string;
            email?: string;
            password?: string;
        }): Promise<{ status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" }> {
            return recipeInterface.updateEmailOrPassword(input);
        },
    };
}
