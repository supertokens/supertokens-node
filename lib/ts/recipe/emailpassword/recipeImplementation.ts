import { RecipeInterface, User } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
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
            if (
                (await this.getUserByEmail({
                    email,
                    userContext,
                })) !== undefined
            ) {
                return {
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                };
            }

            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signup"), {
                email,
                password,
            });
            if (response.status === "OK") {
                return response;
            } else {
                return {
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                };
            }
        },

        signIn: async function (
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
        ): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> {
            if (
                (await this.getUserByEmail({
                    email,
                    userContext,
                })) === undefined
            ) {
                return {
                    status: "WRONG_CREDENTIALS_ERROR",
                };
            }
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

        getUserById: async function ({ userId }: { userId: string }): Promise<User | undefined> {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
                userId,
            });
            if (response.status === "OK") {
                return {
                    ...response.user,
                };
            } else {
                return undefined;
            }
        },

        getUserByEmail: async function ({ email }: { email: string }): Promise<User | undefined> {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
                email,
            });
            if (response.status === "OK") {
                return {
                    ...response.user,
                };
            } else {
                return undefined;
            }
        },

        createResetPasswordToken: async function (
            this: RecipeInterface,
            {
                userId,
                userContext,
            }: {
                userId: string;
                userContext: any;
            }
        ): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
            if ((await this.getUserById({ userId, userContext })) === undefined) {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }

            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/password/reset/token"), {
                userId,
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

        resetPasswordUsingToken: async function ({
            token,
            newPassword,
        }: {
            token: string;
            newPassword: string;
        }): Promise<
            | {
                  status: "OK";
                  /**
                   * The id of the user whose password was reset.
                   * Defined for Core versions 3.9 or later
                   */
                  userId?: string;
              }
            | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
        > {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/password/reset"), {
                method: "token",
                token,
                newPassword,
            });
            return response;
        },

        updateEmailOrPassword: async function (
            this: RecipeInterface,
            input: {
                userId: string;
                email?: string;
                password?: string;
                userContext: any;
            }
        ): Promise<{ status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" }> {
            // TODO: need to solve issue of user ID mapping in general, but especially for this function because we are comparing the input userId with the output userId of another recipe function below
            let user = await this.getUserById({ userId: input.userId, userContext: input.userContext });
            if (user === undefined) {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }

            if (input.email !== undefined) {
                let userBasedOnEmail = await this.getUserByEmail({
                    email: input.email,
                    userContext: input.userContext,
                });
                if (userBasedOnEmail !== undefined && userBasedOnEmail.id !== input.userId) {
                    return {
                        status: "EMAIL_ALREADY_EXISTS_ERROR",
                    };
                }
            }

            let response = await querier.sendPutRequest(new NormalisedURLPath("/recipe/user"), {
                userId: input.userId,
                email: input.email,
                password: input.password,
            });
            if (response.status === "OK") {
                return {
                    status: "OK",
                };
            } else if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return {
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                };
            } else {
                return {
                    status: "UNKNOWN_USER_ID_ERROR",
                };
            }
        },
    };
}
