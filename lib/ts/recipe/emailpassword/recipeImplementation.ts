import { RecipeInterface, TypeNormalisedInput } from "./types";
import AccountLinking from "../accountlinking/recipe";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { getUser } from "../..";
import { User } from "../../types";
import { FORM_FIELD_PASSWORD_ID } from "./constants";
import { mockCreateRecipeUser, mockSignIn } from "./mockCore";

export default function getRecipeInterface(
    querier: Querier,
    getEmailPasswordConfig: () => TypeNormalisedInput
): RecipeInterface {
    return {
        signUp: async function (
            this: RecipeInterface,
            {
                email,
                password,
                userContext,
            }: {
                email: string;
                password: string;
                userContext: any;
            }
        ): Promise<
            | { status: "OK"; user: User }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
            | {
                  status: "SIGNUP_NOT_ALLOWED";
                  reason: string;
              }
        > {
            let isSignUpAllowed = await AccountLinking.getInstanceOrThrowError().isSignUpAllowed({
                newUser: {
                    recipeId: "emailpassword",
                    email,
                },
                userContext,
            });

            if (!isSignUpAllowed) {
                return {
                    status: "SIGNUP_NOT_ALLOWED",
                    reason:
                        "The input email is already associated with a primary account where it is not verified. Please verify the other account before trying again.",
                };
            }

            let response = await this.createNewRecipeUser({
                email,
                password,
                userContext,
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
                user: (await getUser(userId, userContext))!,
            };
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
            if (process.env.MOCK !== "true") {
                return await querier.sendPostRequest(new NormalisedURLPath("/recipe/signup"), {
                    email: input.email,
                    password: input.password,
                });
            } else {
                return mockCreateRecipeUser(input);
            }
        },

        signIn: async function ({
            email,
            password,
        }: {
            email: string;
            password: string;
        }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
            if (process.env.MOCK !== "true") {
                return await querier.sendPostRequest(new NormalisedURLPath("/recipe/signin"), {
                    email,
                    password,
                });
            } else {
                return mockSignIn({ email, password });
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
            return await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/password/reset/token"), {
                userId,
                email,
            });
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
            applyPasswordPolicy?: boolean;
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
            if (input.applyPasswordPolicy || input.applyPasswordPolicy === undefined) {
                let formFields = getEmailPasswordConfig().signUpFeature.formFields;
                if (input.password !== undefined) {
                    const passwordField = formFields.filter((el) => el.id === FORM_FIELD_PASSWORD_ID)[0];
                    const error = await passwordField.validate(input.password);
                    if (error !== undefined) {
                        return {
                            status: "PASSWORD_POLICY_VIOLATED_ERROR",
                            failureReason: error,
                        };
                    }
                }
            }
            return await querier.sendPutRequest(new NormalisedURLPath("/recipe/user"), {
                userId: input.userId,
                email: input.email,
                password: input.password,
            });
        },
    };
}
