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
        clientType: string | undefined,
        tenantId?: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        provider: TypeProvider;
    }>;
    static thirdPartyManuallyCreateOrUpdateUser(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        tenantId?: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;
    static getUserByThirdPartyInfo(
        thirdPartyId: string,
        thirdPartyUserId: string,
        tenantId?: string,
        userContext?: any
    ): Promise<User | undefined>;
    static emailPasswordSignUp(
        email: string,
        password: string,
        tenantId?: string,
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
        tenantId?: string,
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
    static getUsersByEmail(email: string, tenantId?: string, userContext?: any): Promise<User[]>;
    static createResetPasswordToken(
        userId: string,
        tenantId?: string,
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
        tenantId?: string,
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
        tenantIdForPasswordPolicy?: string;
    }): Promise<
        | {
              status: "OK" | "EMAIL_ALREADY_EXISTS_ERROR" | "UNKNOWN_USER_ID_ERROR";
          }
        | {
              status: "PASSWORD_POLICY_VIOLATED_ERROR";
              failureReason: string;
          }
    >;
    static createResetPasswordLink(
        userId: string,
        tenantId?: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              link: string;
          }
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
    >;
    static sendResetPasswordEmail(
        userId: string,
        tenantId?: string,
        userContext?: any
    ): Promise<{
        status: "OK" | "UNKNOWN_USER_ID_ERROR";
    }>;
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
export declare let createResetPasswordLink: typeof Wrapper.createResetPasswordLink;
export declare let sendResetPasswordEmail: typeof Wrapper.sendResetPasswordEmail;
export declare let sendEmail: typeof Wrapper.sendEmail;
