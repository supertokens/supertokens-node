import { RecipeInterface } from "./types";
import AccountLinking from "../accountlinking/recipe";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { getUser } from "../..";
import { User } from "../../types";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        signUp: async function (this: RecipeInterface, {
            email,
            password,
            userContext,
        }: {
            email: string;
            password: string;
            userContext: any;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
            // this function does not check if there is some primary user where the email
            // of that primary user is unverified (isSignUpAllowed function logic) cause
            // that is checked in the API layer before calling this function.
            // This is the recipe function layer which can be
            // called by the user manually as well if they want to. So we allow them to do that.
            let response = await this.createNewRecipeUser({
                email, password, userContext
            });
            if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return response;
            }

            let userId = await AccountLinking.getInstanceOrThrowError().createPrimaryUserIdOrLinkAccounts({
                // we can use index 0 cause this is a new recipe user
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
                isVerified: false,
                userContext,
            });

            return {
                status: "OK",
                user: (await getUser(userId, userContext))!
            };
        },

        createNewRecipeUser: async function (input: {
            email: string;
            password: string;
            userContext: any;
        }): Promise<{
            status: "OK"; user: User
        } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
            return await querier.sendPostRequest(new NormalisedURLPath("/recipe/signup"), {
                email: input.email,
                password: input.password,
            });
        },

        signIn: async function ({
            email,
            password,
        }: {
            email: string;
            password: string;
        }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signin"), {
                email,
                password,
            });
            if (response.status === "OK") {
                return response;
            } else {
                return {
                    status: "WRONG_CREDENTIALS_ERROR",
                };
            }
        },

        createResetPasswordToken: async function ({
            userId,
            email,
        }: {
            userId: string;
            email: string;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            // the input user ID can be a recipe or a primary user ID.
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/password/reset/token"), {
                userId,
                email,
            });
            if (response.status === "OK") {
                return {
                    status: "OK",
                    token: response.token,
                };
            } else {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
        },

        consumePasswordResetToken: async function ({
            token,
        }: {
            token: string;
        }): Promise<
            | {
                status: "OK";
                userId: string;
                email: string;
            }
            | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
        > {
            return await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/password/reset/token/consume"), {
                token,
            });
        },

        updateEmailOrPassword: async function (input: {
            userId: string;
            email?: string;
            password?: string;
        }): Promise<{
            status:
            | "OK"
            | "UNKNOWN_USER_ID_ERROR"
            | "EMAIL_ALREADY_EXISTS_ERROR";
        } | {
            status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
            reason: string
        }> {
            // the input can be primary or recipe level user id.
            return await querier.sendPutRequest(new NormalisedURLPath("/recipe/user"), {
                userId: input.userId,
                email: input.email,
                password: input.password,
            });
        },
    };
}
