// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, APIOptions, APIInterface, TypeEmailPasswordEmailDeliveryInput } from "./types";
import RecipeUserId from "../../recipeUserId";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static signUp(
        tenantId: string,
        email: string,
        password: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              user: import("../../types").User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
    static signIn(
        tenantId: string,
        email: string,
        password: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              user: import("../../types").User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    /**
     * We do not make email optional here cause we want to
     * allow passing in primaryUserId. If we make email optional,
     * and if the user provides a primaryUserId, then it may result in two problems:
     *  - there is no recipeUserId = input primaryUserId, in this case,
     *    this function will throw an error
     *  - There is a recipe userId = input primaryUserId, but that recipe has no email,
     *    or has wrong email compared to what the user wanted to generate a reset token for.
     *
     * And we want to allow primaryUserId being passed in.
     */
    static createResetPasswordToken(
        tenantId: string,
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
    static resetPasswordUsingToken(
        tenantId: string,
        token: string,
        newPassword: string,
        userContext?: any
    ): Promise<
        | {
              status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
          }
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
    static consumePasswordResetToken(
        tenantId: string,
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
        tenantIdForPasswordPolicy?: string;
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
    static createResetPasswordLink(
        tenantId: string,
        userId: string,
        email: string,
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
        tenantId: string,
        userId: string,
        email: string,
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
export declare let signUp: typeof Wrapper.signUp;
export declare let signIn: typeof Wrapper.signIn;
export declare let createResetPasswordToken: typeof Wrapper.createResetPasswordToken;
export declare let resetPasswordUsingToken: typeof Wrapper.resetPasswordUsingToken;
export declare let consumePasswordResetToken: typeof Wrapper.consumePasswordResetToken;
export declare let updateEmailOrPassword: typeof Wrapper.updateEmailOrPassword;
export type { RecipeInterface, APIOptions, APIInterface };
export declare let createResetPasswordLink: typeof Wrapper.createResetPasswordLink;
export declare let sendResetPasswordEmail: typeof Wrapper.sendResetPasswordEmail;
export declare let sendEmail: typeof Wrapper.sendEmail;
