import { RecipeInterface, User } from "../types";
import EmailPasswordImplemenation from "../../emailpassword/recipeImplementation";
import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { Querier } from "../../../querier";
export default class RecipeImplementation implements RecipeInterface {
    emailPasswordImplementation: EmailPasswordImplemenation;
    thirdPartyImplementation: ThirdPartyImplemenation | undefined;
    constructor(emailPasswordQuerier: Querier, thirdPartyQuerier?: Querier);
    signUp: (input: {
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
    signIn: (input: {
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
    signInUp: (input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: {
            id: string;
            isVerified: boolean;
        };
    }) => Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: User;
          }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    >;
    getUserById: (input: { userId: string }) => Promise<User | undefined>;
    getUsersByEmail: ({ email }: { email: string }) => Promise<User[]>;
    getUserByThirdPartyInfo: (input: { thirdPartyId: string; thirdPartyUserId: string }) => Promise<User | undefined>;
    getEmailForUserId: (input: { userId: string }) => Promise<string>;
    /**
     * @deprecated Please do not override this function
     *   */
    getUserByEmail: (input: { email: string }) => Promise<User | undefined>;
    createResetPasswordToken: (input: {
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
    resetPasswordUsingToken: (input: {
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
        nextPaginationTokenString,
    }: {
        limit?: number | undefined;
        nextPaginationTokenString?: string | undefined;
    }) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    /**
     * @deprecated Please do not override this function
     *   */
    getUsersNewestFirst: ({
        limit,
        nextPaginationTokenString,
    }: {
        limit?: number | undefined;
        nextPaginationTokenString?: string | undefined;
    }) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    /**
     * @deprecated Please do not override this function
     *   */
    getUserCount: () => Promise<number>;
    updateEmailOrPassword: (input: {
        userId: string;
        email?: string | undefined;
        password?: string | undefined;
    }) => Promise<{
        status: "OK" | "EMAIL_ALREADY_EXISTS_ERROR" | "UNKNOWN_USER_ID_ERROR";
    }>;
}
