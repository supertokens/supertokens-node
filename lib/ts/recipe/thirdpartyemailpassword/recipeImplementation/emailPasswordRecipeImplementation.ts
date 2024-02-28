import { RecipeInterface } from "../../emailpassword/types";
import { User, UserContext } from "../../../types";
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";
import RecipeUserId from "../../../recipeUserId";
import { SessionContainerInterface } from "../../session/types";

export default function getRecipeInterface(recipeInterface: ThirdPartyEmailPasswordRecipeInterface): RecipeInterface {
    return {
        signUp: async function (input: {
            email: string;
            password: string;
            session: SessionContainerInterface | undefined;
            tenantId: string;
            userContext: UserContext;
        }): Promise<
            | { status: "OK"; user: User; recipeUserId: RecipeUserId }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
            | {
                  status: "LINKING_TO_SESSION_USER_FAILED";
                  reason:
                      | "EMAIL_VERIFICATION_REQUIRED"
                      | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              }
        > {
            return await recipeInterface.emailPasswordSignUp(input);
        },

        verifyCredentials: async function (input: {
            email: string;
            password: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<{ status: "OK" } | { status: "WRONG_CREDENTIALS_ERROR" }> {
            return recipeInterface.emailPasswordVerifyCredentials(input);
        },

        signIn: async function (input: {
            email: string;
            password: string;
            tenantId: string;
            session: SessionContainerInterface | undefined;
            userContext: UserContext;
        }) {
            return recipeInterface.emailPasswordSignIn(input);
        },

        createResetPasswordToken: async function (input: {
            userId: string;
            email: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            return recipeInterface.createResetPasswordToken(input);
        },

        consumePasswordResetToken: async function (input: {
            token: string;
            session: SessionContainerInterface | undefined;
            tenantId: string;
            userContext: UserContext;
        }) {
            return recipeInterface.consumePasswordResetToken(input);
        },

        createNewRecipeUser: async function (input: {
            email: string;
            password: string;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  user: User;
                  recipeUserId: RecipeUserId;
              }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        > {
            return recipeInterface.createNewEmailPasswordRecipeUser(input);
        },

        updateEmailOrPassword: async function (input: {
            recipeUserId: RecipeUserId;
            email?: string;
            password?: string;
            userContext: UserContext;
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
