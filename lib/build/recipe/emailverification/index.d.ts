// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, APIOptions, APIInterface, User, TypeEmailVerificationEmailDeliveryInput } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static EmailVerificationClaim: import("./emailVerificationClaim").EmailVerificationClaimClass;
    static createEmailVerificationToken(
        recipeUserId: string,
        email: string,
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
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
    >;
    static isEmailVerified(recipeUserId: string, email: string, userContext?: any): Promise<boolean>;
    static revokeEmailVerificationTokens(
        recipeUserId: string,
        email: string,
        userContext?: any
    ): Promise<{
        status: "OK";
    }>;
    static unverifyEmail(
        recipeUserId: string,
        email: string,
        userContext?: any
    ): Promise<{
        status: "OK";
    }>;
    static sendEmail(
        input: TypeEmailVerificationEmailDeliveryInput & {
            userContext?: any;
        }
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let createEmailVerificationToken: typeof Wrapper.createEmailVerificationToken;
export declare let verifyEmailUsingToken: typeof Wrapper.verifyEmailUsingToken;
export declare let isEmailVerified: typeof Wrapper.isEmailVerified;
export declare let revokeEmailVerificationTokens: typeof Wrapper.revokeEmailVerificationTokens;
export declare let unverifyEmail: typeof Wrapper.unverifyEmail;
export type { RecipeInterface, APIOptions, APIInterface, User };
export declare let sendEmail: typeof Wrapper.sendEmail;
export { EmailVerificationClaim } from "./emailVerificationClaim";
