// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import {
    RecipeInterface,
    APIOptions,
    APIInterface,
    UserEmailInfo,
    TypeEmailVerificationEmailDeliveryInput,
} from "./types";
import RecipeUserId from "../../recipeUserId";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static EmailVerificationClaim: import("./emailVerificationClaim").EmailVerificationClaimClass;
    static createEmailVerificationToken(
        tenantId: string,
        recipeUserId: RecipeUserId,
        email?: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "EMAIL_ALREADY_VERIFIED_ERROR";
          }
    >;
    static createEmailVerificationLink(
        tenantId: string,
        recipeUserId: RecipeUserId,
        email?: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              link: string;
          }
        | {
              status: "EMAIL_ALREADY_VERIFIED_ERROR";
          }
    >;
    static sendEmailVerificationEmail(
        tenantId: string,
        userId: string,
        recipeUserId: RecipeUserId,
        email?: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
          }
        | {
              status: "EMAIL_ALREADY_VERIFIED_ERROR";
          }
    >;
    static verifyEmailUsingToken(
        tenantId: string,
        token: string,
        attemptAccountLinking?: boolean,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              user: UserEmailInfo;
          }
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
    >;
    static isEmailVerified(
        recipeUserId: RecipeUserId,
        email?: string,
        userContext?: Record<string, any>
    ): Promise<boolean>;
    static revokeEmailVerificationTokens(
        tenantId: string,
        recipeUserId: RecipeUserId,
        email?: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: string;
    }>;
    static unverifyEmail(
        recipeUserId: RecipeUserId,
        email?: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: string;
    }>;
    static sendEmail(
        input: TypeEmailVerificationEmailDeliveryInput & {
            userContext?: Record<string, any>;
        }
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let createEmailVerificationToken: typeof Wrapper.createEmailVerificationToken;
export declare let createEmailVerificationLink: typeof Wrapper.createEmailVerificationLink;
export declare let sendEmailVerificationEmail: typeof Wrapper.sendEmailVerificationEmail;
export declare let verifyEmailUsingToken: typeof Wrapper.verifyEmailUsingToken;
export declare let isEmailVerified: typeof Wrapper.isEmailVerified;
export declare let revokeEmailVerificationTokens: typeof Wrapper.revokeEmailVerificationTokens;
export declare let unverifyEmail: typeof Wrapper.unverifyEmail;
export type { RecipeInterface, APIOptions, APIInterface, UserEmailInfo };
export declare let sendEmail: typeof Wrapper.sendEmail;
export { EmailVerificationClaim } from "./emailVerificationClaim";
