import { RecipeInterface, User } from "../../emailpassword/types";
import { RecipeInterface as ThirdPartyRecipeInterface } from "../types";
export default class RecipeImplementation implements RecipeInterface {
    recipeImplementation: ThirdPartyRecipeInterface;
    constructor(recipeImplementation: ThirdPartyRecipeInterface);
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
    getUsersOldestFirst: (_: {
        limit?: number | undefined;
        nextPaginationToken?: string | undefined;
    }) => Promise<never>;
    getUsersNewestFirst: (_: {
        limit?: number | undefined;
        nextPaginationToken?: string | undefined;
    }) => Promise<never>;
    getUserCount: () => Promise<never>;
}
