import { RecipeInterface, User } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier) {
        this.querier = querier;
    }

    signUp = async (
        email: string,
        password: string
    ): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }> => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/signup"), {
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
    };

    signIn = async (
        email: string,
        password: string
    ): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }> => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/signin"), {
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

    createResetPasswordToken = async (
        userId: string
    ): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID" }> => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/user/password/reset/token"), {
            userId,
        });
        if (response.status === "OK") {
            return {
                status: "OK",
                token: response.token,
            };
        } else {
            return {
                status: "UNKNOWN_USER_ID",
            };
        }
    };

    resetPasswordUsingToken = async (
        token: string,
        newPassword: string
    ): Promise<{ status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR" }> => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/user/password/reset"), {
            method: "token",
            token,
            newPassword,
        });
        return response;
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
