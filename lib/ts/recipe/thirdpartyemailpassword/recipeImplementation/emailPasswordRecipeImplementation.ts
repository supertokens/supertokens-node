import { RecipeInterface } from "../../emailpassword/types";
import { User } from "../../../types";
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";
import RecipeUserId from "../../../recipeUserId";

export default function getRecipeInterface(recipeInterface: ThirdPartyEmailPasswordRecipeInterface): RecipeInterface {
    return {
        signUp: async function (input: {
            email: string;
            password: string;
            userContext: any;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
            return await recipeInterface.emailPasswordSignUp(input);
        },

        signIn: async function (input: {
            email: string;
            password: string;
            attemptAccountLinking: boolean;
            userContext: any;
        }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
            return recipeInterface.emailPasswordSignIn(input);
        },

        createResetPasswordToken: async function (input: {
            userId: string;
            email: string;
            userContext: any;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            return recipeInterface.createResetPasswordToken(input);
        },

        consumePasswordResetToken: async function (input: { token: string; userContext: any }) {
            return recipeInterface.consumePasswordResetToken(input);
        },

        getPasswordResetTokenInfo: async function (input: { token: string; userContext: any }) {
            return recipeInterface.getPasswordResetTokenInfo(input);
        },

        createNewRecipeUser: async function (input: {
            email: string;
            password: string;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  user: User;
              }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        > {
            return recipeInterface.createNewEmailPasswordRecipeUser(input);
        },

        updateEmailOrPassword: async function (input: {
            recipeUserId: RecipeUserId;
            email?: string;
            password?: string;
            userContext: any;
            applyPasswordPolicy: boolean;
        }): Promise<
            | {
                  status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
              }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
            | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
        > {
            return recipeInterface.updateEmailOrPassword(input);
        },
    };
}
