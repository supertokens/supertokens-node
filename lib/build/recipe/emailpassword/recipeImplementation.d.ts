import { RecipeInterface, User } from "./types";
import { Querier } from "../../querier";
export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier);
    signUp: (
        email: string,
        password: string
    ) => Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
    signIn: (
        email: string,
        password: string
    ) => Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    getUserById: (userId: string) => Promise<User | undefined>;
    getUserByEmail: (email: string) => Promise<User | undefined>;
    createResetPasswordToken: (
        userId: string
    ) => Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "UNKNOWN_USER_ID";
          }
    >;
    resetPasswordUsingToken: (
        token: string,
        newPassword: string
    ) => Promise<{
        status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    }>;
    getUsersOldestFirst: (
        limit?: number | undefined,
        nextPaginationToken?: string | undefined
    ) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    getUsersNewestFirst: (
        limit?: number | undefined,
        nextPaginationToken?: string | undefined
    ) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    getUserCount: () => Promise<number>;
    getUsers: (
        timeJoinedOrder: "ASC" | "DESC",
        limit?: number | undefined,
        paginationToken?: string | undefined
    ) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
}
