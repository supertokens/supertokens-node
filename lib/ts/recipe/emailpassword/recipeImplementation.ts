import { RecipeInterface, User } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import STError from "./error";

export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier) {
        this.querier = querier;
    }

    signUp = async (email: string, password: string): Promise<User> => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/signup"), {
            email,
            password,
        });
        if (response.status === "OK") {
            return {
                ...response.user,
            };
        } else {
            throw new STError({
                message: "Sign up failed because the email, " + email + ", is already taken",
                type: STError.EMAIL_ALREADY_EXISTS_ERROR,
            });
        }
    };

    signIn = async (email: string, password: string): Promise<User> => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/signin"), {
            email,
            password,
        });
        if (response.status === "OK") {
            return {
                ...response.user,
            };
        } else {
            throw new STError({
                message: "Sign in failed because of incorrect email & password combination",
                type: STError.WRONG_CREDENTIALS_ERROR,
            });
        }
    };

    getUserById = async (userId: string): Promise<User | undefined> => {
        let response = await this.querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
            userId,
        });
        if (response.status === "OK") {
            return {
                ...response.user,
            };
        } else {
            return undefined;
        }
    };

    getUserByEmail = async (email: string): Promise<User | undefined> => {
        let response = await this.querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
            email,
        });
        if (response.status === "OK") {
            return {
                ...response.user,
            };
        } else {
            return undefined;
        }
    };

    createResetPasswordToken = async (userId: string): Promise<string> => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/user/password/reset/token"), {
            userId,
        });
        if (response.status === "OK") {
            return response.token;
        } else {
            throw new STError({
                type: STError.UNKNOWN_USER_ID_ERROR,
                message: "Failed to generated password reset token as the user ID is unknown",
            });
        }
    };

    resetPasswordUsingToken = async (token: string, newPassword: string) => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/user/password/reset"), {
            method: "token",
            token,
            newPassword,
        });
        if (response.status !== "OK") {
            throw new STError({
                type: STError.RESET_PASSWORD_INVALID_TOKEN_ERROR,
                message: "Failed to reset password as the the token has expired or is invalid",
            });
        }
    };

    getUsersOldestFirst = async (limit?: number, nextPaginationToken?: string) => {
        return this.getUsers("ASC", limit, nextPaginationToken);
    };

    getUsersNewestFirst = async (limit?: number, nextPaginationToken?: string) => {
        return this.getUsers("DESC", limit, nextPaginationToken);
    };

    getUserCount = async (): Promise<number> => {
        let response = await this.querier.sendGetRequest(new NormalisedURLPath("/recipe/users/count"), {});
        return Number(response.count);
    };

    getUsers = async (
        timeJoinedOrder: "ASC" | "DESC",
        limit?: number,
        paginationToken?: string
    ): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }> => {
        let response = await this.querier.sendGetRequest(new NormalisedURLPath("/recipe/users"), {
            timeJoinedOrder,
            limit,
            paginationToken,
        });
        return {
            users: response.users,
            nextPaginationToken: response.nextPaginationToken,
        };
    };
}
