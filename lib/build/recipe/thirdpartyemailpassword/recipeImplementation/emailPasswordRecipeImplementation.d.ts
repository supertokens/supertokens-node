import { RecipeInterface, User } from "../../emailpassword/types";
import { RecipeInterface as ThirdPartyRecipeInterface } from "../types";
export default class RecipeImplementation implements RecipeInterface {
    recipeImplementation: ThirdPartyRecipeInterface;
    constructor(recipeImplementation: ThirdPartyRecipeInterface);
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
    getUsersOldestFirst: (_?: number | undefined, __?: string | undefined) => Promise<never>;
    getUsersNewestFirst: (_?: number | undefined, __?: string | undefined) => Promise<never>;
    getUserCount: () => Promise<never>;
}
