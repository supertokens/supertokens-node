import { RecipeInterface, TypeNormalisedInput } from "./types";
import AccountLinking from "../accountlinking/recipe";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { getUser } from "../..";
import { User } from "../../types";
import { FORM_FIELD_PASSWORD_ID } from "./constants";
import {
    mockCreateRecipeUser,
    mockSignIn,
    mockConsumePasswordResetToken,
    mockCreatePasswordResetToken,
    mockUpdateEmailOrPassword,
    mockGetPasswordResetInfo,
} from "./mockCore";
import RecipeUserId from "../../recipeUserId";

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
        ): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
            let response = await this.createNewRecipeUser({
                email,
                password,
                userContext,
            });
            if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return response;
            }

            let userId = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                // we can use index 0 cause this is a new recipe user
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                checkAccountsToLinkTableAsWell: true,
                userContext,
            });

            let updatedUser = await getUser(userId, userContext);

            if (updatedUser === undefined) {
                throw new Error("Should never come here.");
            }

            return {
                status: "OK",
                user: updatedUser,
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

            // TODO: mark email as verified using verifyEmailForRecipeUserIfLinkedAccountsAreVerified
        },

        createResetPasswordToken: async function ({
            userId,
            email,
        }: {
            userId: string;
            email: string;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            if (process.env.MOCK !== "true") {
                // the input user ID can be a recipe or a primary user ID.
                return await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/password/reset/token"), {
                    userId,
                    email,
                });
            } else {
                return mockCreatePasswordResetToken(email, userId);
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
            if (process.env.MOCK !== "true") {
                return await querier.sendPostRequest(
                    new NormalisedURLPath("/recipe/user/password/reset/token/consume"),
                    {
                        token,
                    }
                );
            } else {
                return mockConsumePasswordResetToken(token);
            }
        },

        getPasswordResetTokenInfo: async function ({
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
            if (process.env.MOCK !== "true") {
                return await querier.sendGetRequest(new NormalisedURLPath("/recipe/user/password/reset/token"), {
                    token,
                });
            } else {
                return mockGetPasswordResetInfo(token);
            }
        },

        updateEmailOrPassword: async function (input: {
            recipeUserId: RecipeUserId;
            email?: string;
            password?: string;
            applyPasswordPolicy?: boolean;
            userContext: any;
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

            if (process.env.MOCK !== "true") {
                // the input userId must be a recipe user ID.
                return await querier.sendPutRequest(new NormalisedURLPath("/recipe/user"), {
                    userId: input.recipeUserId.getAsString(),
                    email: input.email,
                    password: input.password,
                });
            } else {
                return mockUpdateEmailOrPassword({
                    ...input,
                    querier,
                });
            }

            // TODO: mark email as verified using verifyEmailForRecipeUserIfLinkedAccountsAreVerified
        },
    };
}
