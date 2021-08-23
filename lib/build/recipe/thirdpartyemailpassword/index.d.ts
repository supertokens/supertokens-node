import Recipe from "./recipe";
import SuperTokensError from "./error";
import {
    RecipeInterface,
    User,
    APIInterface,
    EmailPasswordAPIOptions,
    ThirdPartyAPIOptions,
    SignInUpAPIInput,
    SignInUpAPIOutput,
} from "./types";
import { TypeProvider } from "../thirdparty/types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static signInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ): Promise<
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
    static getUserByThirdPartyInfo(thirdPartyId: string, thirdPartyUserId: string): Promise<User | undefined>;
    static signUp(
        email: string,
        password: string
    ): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
    static signIn(
        email: string,
        password: string
    ): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    static getUserById(userId: string): Promise<User | undefined>;
    static getUsersByEmail(email: string): Promise<User[]>;
    /**
     * @deprecated Use supertokens.getUsersByEmail(...) function instead IF using core version >= 3.5
     *   */
    static getUserByEmail(email: string): Promise<User | undefined>;
    static createResetPasswordToken(
        userId: string
    ): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
    >;
    static resetPasswordUsingToken(
        token: string,
        newPassword: string
    ): Promise<{
        status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    }>;
    /**
     * @deprecated Use supertokens.getUsersOldestFirst(...) function instead IF using core version >= 3.5
     *   */
    static getUsersOldestFirst(
        limit?: number,
        nextPaginationToken?: string
    ): Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    /**
     * @deprecated Use supertokens.getUsersNewestFirst(...) function instead IF using core version >= 3.5
     *   */
    static getUsersNewestFirst(
        limit?: number,
        nextPaginationToken?: string
    ): Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    /**
     * @deprecated Use supertokens.getUserCount(...) function instead IF using core version >= 3.5
     *   */
    static getUserCount(): Promise<number>;
    static updateEmailOrPassword(input: {
        userId: string;
        email?: string;
        password?: string;
    }): Promise<{
        status: "OK" | "EMAIL_ALREADY_EXISTS_ERROR" | "UNKNOWN_USER_ID_ERROR";
    }>;
    static createEmailVerificationToken(userId: string): Promise<string>;
    static verifyEmailUsingToken(token: string): Promise<User>;
    static isEmailVerified(userId: string): Promise<boolean>;
    static revokeEmailVerificationTokens(userId: string): Promise<void>;
    static unverifyEmail(userId: string): Promise<void>;
    static Google: typeof import("../thirdparty/providers/google").default;
    static Github: typeof import("../thirdparty/providers/github").default;
    static Facebook: typeof import("../thirdparty/providers/facebook").default;
    static Apple: typeof import("../thirdparty/providers/apple").default;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let signUp: typeof Wrapper.signUp;
export declare let signIn: typeof Wrapper.signIn;
export declare let signInUp: typeof Wrapper.signInUp;
export declare let getUserById: typeof Wrapper.getUserById;
export declare let getUserByThirdPartyInfo: typeof Wrapper.getUserByThirdPartyInfo;
/**
 * @deprecated Use supertokens.getUsersByEmail(...) function instead IF using core version >= 3.5
 *   */
export declare let getUserByEmail: typeof Wrapper.getUserByEmail;
export declare let getUsersByEmail: typeof Wrapper.getUsersByEmail;
export declare let createResetPasswordToken: typeof Wrapper.createResetPasswordToken;
export declare let resetPasswordUsingToken: typeof Wrapper.resetPasswordUsingToken;
export declare let createEmailVerificationToken: typeof Wrapper.createEmailVerificationToken;
export declare let verifyEmailUsingToken: typeof Wrapper.verifyEmailUsingToken;
export declare let isEmailVerified: typeof Wrapper.isEmailVerified;
export declare let revokeEmailVerificationTokens: typeof Wrapper.revokeEmailVerificationTokens;
export declare let unverifyEmail: typeof Wrapper.unverifyEmail;
/**
 * @deprecated Use supertokens.getUsersOldestFirst(...) function instead IF using core version >= 3.5
 *   */
export declare let getUsersOldestFirst: typeof Wrapper.getUsersOldestFirst;
/**
 * @deprecated Use supertokens.getUsersNewestFirst(...) function instead IF using core version >= 3.5
 *   */
export declare let getUsersNewestFirst: typeof Wrapper.getUsersNewestFirst;
/**
 * @deprecated Use supertokens.getUserCount(...) function instead IF using core version >= 3.5
 *   */
export declare let getUserCount: typeof Wrapper.getUserCount;
export declare let updateEmailOrPassword: typeof Wrapper.updateEmailOrPassword;
export declare let Google: typeof import("../thirdparty/providers/google").default;
export declare let Github: typeof import("../thirdparty/providers/github").default;
export declare let Facebook: typeof import("../thirdparty/providers/facebook").default;
export declare let Apple: typeof import("../thirdparty/providers/apple").default;
export type {
    RecipeInterface,
    TypeProvider,
    User,
    APIInterface,
    EmailPasswordAPIOptions,
    ThirdPartyAPIOptions,
    SignInUpAPIInput,
    SignInUpAPIOutput,
};
