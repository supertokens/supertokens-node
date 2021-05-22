import { RecipeInterface, User } from "./types";
import { Querier } from "../../querier";
export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier);
    signUp: (email: string, password: string) => Promise<User>;
    signIn: (email: string, password: string) => Promise<User>;
    getUserById: (userId: string) => Promise<User | undefined>;
    getUserByEmail: (email: string) => Promise<User | undefined>;
    createResetPasswordToken: (userId: string) => Promise<string>;
    resetPasswordUsingToken: (token: string, newPassword: string) => Promise<void>;
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
