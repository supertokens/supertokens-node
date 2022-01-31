import { RecipeInterface, User } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        signUp: async function ({
            email,
            password,
        }: {
            email: string;
            password: string;
        }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> {
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

        createResetPasswordToken: async function ({
            userId,
        }: {
            userId: string;
        }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
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

        updateEmailOrPassword: async function (input: {
            userId: string;
            email?: string;
            password?: string;
        }): Promise<{ status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" }> {
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
