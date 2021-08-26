import { RecipeInterface, User } from "../../emailpassword/types";
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";
export default class RecipeImplementation implements RecipeInterface {
    recipeImplementation: ThirdPartyEmailPasswordRecipeInterface;
    constructor(recipeImplementation: ThirdPartyEmailPasswordRecipeInterface);
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
              status: "UNKNOWN_USER_ID_ERROR";
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
     * @deprecated
     *   */
    getUsersOldestFirst: (_: {
        limit?: number | undefined;
        nextPaginationToken?: string | undefined;
    }) => Promise<never>;
    /**
     * @deprecated
     *   */
    getUsersNewestFirst: (_: {
        limit?: number | undefined;
        nextPaginationToken?: string | undefined;
    }) => Promise<never>;
    /**
     * @deprecated
     *   */
    getUserCount: () => Promise<never>;
    updateEmailOrPassword: (input: {
        userId: string;
        email?: string | undefined;
        password?: string | undefined;
    }) => Promise<{
        status: "OK" | "EMAIL_ALREADY_EXISTS_ERROR" | "UNKNOWN_USER_ID_ERROR";
    }>;
}
