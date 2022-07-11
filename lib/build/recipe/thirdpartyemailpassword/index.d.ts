// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, User, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions } from "./types";
import { TypeProvider } from "../thirdparty/types";
import { TypeEmailPasswordEmailDeliveryInput } from "../emailpassword/types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static thirdPartySignInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        },
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
    }): Promise<{
        status: "OK" | "EMAIL_ALREADY_EXISTS_ERROR" | "UNKNOWN_USER_ID_ERROR";
    }>;
    static createEmailVerificationToken(
        userId: string,
        userContext?: any
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
        token: string,
        userContext?: any
    ): Promise<
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
        | User
        | undefined
    >;
    static isEmailVerified(userId: string, userContext?: any): Promise<boolean>;
    static revokeEmailVerificationTokens(
        userId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
    }>;
    static unverifyEmail(
        userId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
    }>;
    static Google: typeof import("../thirdparty/providers/google").default;
    static Github: typeof import("../thirdparty/providers/github").default;
    static Facebook: typeof import("../thirdparty/providers/facebook").default;
    static Apple: typeof import("../thirdparty/providers/apple").default;
    static Discord: typeof import("../thirdparty/providers/discord").default;
    static GoogleWorkspaces: typeof import("../thirdparty/providers/googleWorkspaces").default;
    static sendEmail(
        input: TypeEmailPasswordEmailDeliveryInput & {
            userContext: any;
        }
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let emailPasswordSignUp: typeof Wrapper.emailPasswordSignUp;
export declare let emailPasswordSignIn: typeof Wrapper.emailPasswordSignIn;
export declare let thirdPartySignInUp: typeof Wrapper.thirdPartySignInUp;
export declare let getUserById: typeof Wrapper.getUserById;
export declare let getUserByThirdPartyInfo: typeof Wrapper.getUserByThirdPartyInfo;
export declare let getUsersByEmail: typeof Wrapper.getUsersByEmail;
export declare let createResetPasswordToken: typeof Wrapper.createResetPasswordToken;
export declare let resetPasswordUsingToken: typeof Wrapper.resetPasswordUsingToken;
export declare let createEmailVerificationToken: typeof Wrapper.createEmailVerificationToken;
export declare let verifyEmailUsingToken: typeof Wrapper.verifyEmailUsingToken;
export declare let isEmailVerified: typeof Wrapper.isEmailVerified;
export declare let revokeEmailVerificationTokens: typeof Wrapper.revokeEmailVerificationTokens;
export declare let unverifyEmail: typeof Wrapper.unverifyEmail;
export declare let updateEmailOrPassword: typeof Wrapper.updateEmailOrPassword;
export declare let Google: typeof import("../thirdparty/providers/google").default;
export declare let Github: typeof import("../thirdparty/providers/github").default;
export declare let Facebook: typeof import("../thirdparty/providers/facebook").default;
export declare let Apple: typeof import("../thirdparty/providers/apple").default;
export declare let Discord: typeof import("../thirdparty/providers/discord").default;
export declare let GoogleWorkspaces: typeof import("../thirdparty/providers/googleWorkspaces").default;
export type { RecipeInterface, TypeProvider, User, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions };
export declare let sendEmail: typeof Wrapper.sendEmail;
