import { RecipeInterface, User } from "../types";
import EmailPasswordImplemenation from "../../emailpassword/recipeImplementation";
import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { Querier } from "../../../querier";
export default class RecipeImplementation implements RecipeInterface {
    emailPasswordImplementation: EmailPasswordImplemenation;
    thirdPartyImplementation: ThirdPartyImplemenation | undefined;
    constructor(emailPasswordQuerier: Querier, thirdPartyQuerier?: Querier);
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
    signInUp: (
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ) => Promise<{
        createdNewUser: boolean;
        user: User;
    }>;
    getUserById: (userId: string) => Promise<User | undefined>;
    getUserByThirdPartyInfo: (thirdPartyId: string, thirdPartyUserId: string) => Promise<User | undefined>;
    getEmailForUserId: (userId: string) => Promise<string>;
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
        nextPaginationTokenString?: string | undefined
    ) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    getUsersNewestFirst: (
        limit?: number | undefined,
        nextPaginationTokenString?: string | undefined
    ) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    getUserCount: () => Promise<number>;
}
