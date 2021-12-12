import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, APIOptions, APIInterface, User } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static createEmailVerificationToken(userId: string, email: string): Promise<any>;
    static verifyEmailUsingToken(token: string): Promise<any>;
    static isEmailVerified(userId: string, email: string): Promise<any>;
    static revokeEmailVerificationTokens(userId: string, email: string): Promise<any>;
    static unverifyEmail(userId: string, email: string): Promise<any>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let createEmailVerificationToken: typeof Wrapper.createEmailVerificationToken;
export declare let verifyEmailUsingToken: typeof Wrapper.verifyEmailUsingToken;
export declare let isEmailVerified: typeof Wrapper.isEmailVerified;
export declare let revokeEmailVerificationTokens: typeof Wrapper.revokeEmailVerificationTokens;
export declare let unverifyEmail: typeof Wrapper.unverifyEmail;
export type { RecipeInterface, APIOptions, APIInterface, User };
