import { RecipeInterface, User } from "./types";
import { Querier } from "../../querier";
export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier);
    signUp: ({
        email,
        password,
    }: {
        email: string;
        password: string;
    }) => Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
    signIn: ({
        email,
        password,
    }: {
        email: string;
        password: string;
    }) => Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    getUserById: ({ userId }: { userId: string }) => Promise<User | undefined>;
    getUserByEmail: ({ email }: { email: string }) => Promise<User | undefined>;
    createResetPasswordToken: ({
        userId,
    }: {
        userId: string;
    }) => Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "UNKNOWN_USER_ID";
          }
    >;
    resetPasswordUsingToken: ({
        token,
        newPassword,
    }: {
        token: string;
        newPassword: string;
    }) => Promise<{
        status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    }>;
    /**
     * @deprecated Please do not override this function
     *   */
    getUsersOldestFirst: ({
        limit,
        nextPaginationToken,
    }: {
        limit?: number | undefined;
        nextPaginationToken?: string | undefined;
    }) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    /**
     * @deprecated Please do not override this function
     *   */
    getUsersNewestFirst: ({
        limit,
        nextPaginationToken,
    }: {
        limit?: number | undefined;
        nextPaginationToken?: string | undefined;
    }) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    /**
     * @deprecated Please do not override this function
     *   */
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
