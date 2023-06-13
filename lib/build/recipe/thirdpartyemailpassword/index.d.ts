// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions } from "./types";
import { TypeProvider } from "../thirdparty/types";
import { TypeEmailPasswordEmailDeliveryInput } from "../emailpassword/types";
import RecipeUserId from "../../recipeUserId";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static thirdPartySignInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: import("../emailpassword").User;
          }
        | {
              status: "SIGN_IN_UP_NOT_ALLOWED";
              reason: string;
          }
    >;
    static emailPasswordSignUp(
        email: string,
        password: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              user: import("../emailpassword").User;
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
              user: import("../emailpassword").User;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    static createResetPasswordToken(
        userId: string,
        email: string,
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
    static consumePasswordResetToken(
        token: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              email: string;
              userId: string;
          }
        | {
              status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
          }
    >;
    static getPasswordResetTokenInfo(
        token: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              email: string;
              userId: string;
          }
        | {
              status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
          }
    >;
    static updateEmailOrPassword(input: {
        recipeUserId: RecipeUserId;
        email?: string;
        password?: string;
        userContext?: any;
        applyPasswordPolicy?: boolean;
    }): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
        | {
              status: "PASSWORD_POLICY_VIOLATED_ERROR";
              failureReason: string;
          }
    >;
    static Google: typeof import("../thirdparty/providers/google").default;
    static Github: typeof import("../thirdparty/providers/github").default;
    static Facebook: typeof import("../thirdparty/providers/facebook").default;
    static Apple: typeof import("../thirdparty/providers/apple").default;
    static Discord: typeof import("../thirdparty/providers/discord").default;
    static GoogleWorkspaces: typeof import("../thirdparty/providers/googleWorkspaces").default;
    static Bitbucket: typeof import("../thirdparty/providers/bitbucket").default;
    static GitLab: typeof import("../thirdparty/providers/gitlab").default;
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
export declare let thirdPartySignInUp: typeof Wrapper.thirdPartySignInUp;
export declare let createResetPasswordToken: typeof Wrapper.createResetPasswordToken;
export declare let consumePasswordResetToken: typeof Wrapper.consumePasswordResetToken;
export declare let updateEmailOrPassword: typeof Wrapper.updateEmailOrPassword;
export declare let getPasswordResetTokenInfo: typeof Wrapper.getPasswordResetTokenInfo;
export declare let Google: typeof import("../thirdparty/providers/google").default;
export declare let Github: typeof import("../thirdparty/providers/github").default;
export declare let Facebook: typeof import("../thirdparty/providers/facebook").default;
export declare let Apple: typeof import("../thirdparty/providers/apple").default;
export declare let Discord: typeof import("../thirdparty/providers/discord").default;
export declare let GoogleWorkspaces: typeof import("../thirdparty/providers/googleWorkspaces").default;
export declare let Bitbucket: typeof import("../thirdparty/providers/bitbucket").default;
export declare let GitLab: typeof import("../thirdparty/providers/gitlab").default;
export type { RecipeInterface, TypeProvider, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions };
export declare let sendEmail: typeof Wrapper.sendEmail;
