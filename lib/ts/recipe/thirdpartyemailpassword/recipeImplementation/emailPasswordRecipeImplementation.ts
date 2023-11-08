import { RecipeInterface } from "../../emailpassword/types";
import { User } from "../../../types";
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";
import RecipeUserId from "../../../recipeUserId";

export default function getRecipeInterface(recipeInterface: ThirdPartyEmailPasswordRecipeInterface): RecipeInterface {
    return {
        signUp: async function (input: {
            email: string;
            password: string;
            tenantId: string;
            userContext: any;
        }): Promise<
            | { status: "OK"; user: User; recipeUserId: RecipeUserId; isValidFirstFactorForTenant: boolean | undefined }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        > {
            return await recipeInterface.emailPasswordSignUp(input);
        },

        signIn: async function (input: {
            email: string;
            password: string;
            tenantId: string;
            userContext: any;
        }): Promise<
            | { status: "OK"; user: User; recipeUserId: RecipeUserId; isValidFirstFactorForTenant: boolean | undefined }
            | { status: "WRONG_CREDENTIALS_ERROR" }
        > {
            return recipeInterface.emailPasswordSignIn(input);
        },

        createResetPasswordToken: async function (input: {
            userId: string;
            email: string;
            tenantId: string;
            userContext: any;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            return recipeInterface.createResetPasswordToken(input);
        },

        consumePasswordResetToken: async function (input: { token: string; tenantId: string; userContext: any }) {
            return recipeInterface.consumePasswordResetToken(input);
        },

        createNewRecipeUser: async function (input: {
            email: string;
            password: string;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  user: User;
                  recipeUserId: RecipeUserId;
                  isValidFirstFactorForTenant: boolean | undefined;
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
            tenantIdForPasswordPolicy: string;
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
