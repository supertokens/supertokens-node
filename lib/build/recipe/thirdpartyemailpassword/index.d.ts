// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, User, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions } from "./types";
import { TypeProvider } from "../thirdparty/types";
import { TypeEmailPasswordEmailDeliveryInput } from "../emailpassword/types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static thirdPartyGetProvider(
        thirdPartyId: string,
        tenantId: string | undefined,
        clientType: string | undefined,
        userContext?: any
    ): Promise<{
        status: "OK";
        provider: TypeProvider;
        thirdPartyEnabled: boolean;
    }>;
    static thirdPartyManuallyCreateOrUpdateUser(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;
    static getUserByThirdPartyInfo(
        thirdPartyId: string,
        thirdPartyUserId: string,
        userContext?: any
    ): Promise<User | undefined>;
    static emailPasswordSignUp(
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
    static emailPasswordSignIn(
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
    static getUsersByEmail(email: string, userContext?: any): Promise<User[]>;
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
        applyPasswordPolicy?: boolean;
    }): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "PASSWORD_POLICY_VIOLATED_ERROR";
              failureReason: string;
          }
    >;
    static sendEmail(
        input: TypeEmailPasswordEmailDeliveryInput & {
            userContext?: any;
        }
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let emailPasswordSignUp: typeof Wrapper.emailPasswordSignUp;
export declare let emailPasswordSignIn: typeof Wrapper.emailPasswordSignIn;
export declare let thirdPartyGetProvider: typeof Wrapper.thirdPartyGetProvider;
export declare let thirdPartyManuallyCreateOrUpdateUser: typeof Wrapper.thirdPartyManuallyCreateOrUpdateUser;
export declare let getUserById: typeof Wrapper.getUserById;
export declare let getUserByThirdPartyInfo: typeof Wrapper.getUserByThirdPartyInfo;
export declare let getUsersByEmail: typeof Wrapper.getUsersByEmail;
export declare let createResetPasswordToken: typeof Wrapper.createResetPasswordToken;
export declare let resetPasswordUsingToken: typeof Wrapper.resetPasswordUsingToken;
export declare let updateEmailOrPassword: typeof Wrapper.updateEmailOrPassword;
export type { RecipeInterface, TypeProvider, User, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions };
export declare let sendEmail: typeof Wrapper.sendEmail;
