// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, User, APIOptions, APIInterface, TypeEmailPasswordEmailDeliveryInput } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static signUp(
        email: string,
        password: string,
        userContext?: any
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
        password: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    static getUserById(userId: string, userContext?: any): Promise<User | undefined>;
    static getUserByEmail(email: string, userContext?: any): Promise<User | undefined>;
    static createResetPasswordToken(
        userId: string,
        userContext?: any
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
        newPassword: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              userId?: string | undefined;
          }
        | {
              status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
          }
    >;
    static updateEmailOrPassword(input: {
        userId: string;
        email?: string;
        password?: string;
        userContext?: any;
    }): Promise<{
        status: "OK" | "EMAIL_ALREADY_EXISTS_ERROR" | "UNKNOWN_USER_ID_ERROR";
    }>;
    static sendEmail(
        input: TypeEmailPasswordEmailDeliveryInput & {
            userContext?: any;
        }
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let signUp: typeof Wrapper.signUp;
export declare let signIn: typeof Wrapper.signIn;
export declare let getUserById: typeof Wrapper.getUserById;
export declare let getUserByEmail: typeof Wrapper.getUserByEmail;
export declare let createResetPasswordToken: typeof Wrapper.createResetPasswordToken;
export declare let resetPasswordUsingToken: typeof Wrapper.resetPasswordUsingToken;
export declare let updateEmailOrPassword: typeof Wrapper.updateEmailOrPassword;
export type { RecipeInterface, User, APIOptions, APIInterface };
export declare let sendEmail: typeof Wrapper.sendEmail;
