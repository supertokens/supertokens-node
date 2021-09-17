// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, User, APIOptions, APIInterface } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
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
    static createEmailVerificationToken(
        userId: string
    ): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "EMAIL_ALREADY_VERIFIED_ERROR";
          }
    >;
    static verifyEmailUsingToken(
        token: string
    ): Promise<
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
        | User
        | undefined
    >;
    static isEmailVerified(userId: string): Promise<boolean>;
    static revokeEmailVerificationTokens(
        userId: string
    ): Promise<{
        status: "OK";
    }>;
    static unverifyEmail(
        userId: string
    ): Promise<{
        status: "OK";
    }>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let signUp: typeof Wrapper.signUp;
export declare let signIn: typeof Wrapper.signIn;
export declare let getUserById: typeof Wrapper.getUserById;
export declare let getUserByEmail: typeof Wrapper.getUserByEmail;
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
export type { RecipeInterface, User, APIOptions, APIInterface };
