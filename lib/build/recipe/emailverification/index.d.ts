import Recipe from "./recipe";
import SuperTokensError from "./error";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static createEmailVerificationToken(userId: string, email: string): Promise<string>;
    static verifyEmailUsingToken(token: string): Promise<import("./types").User>;
    static isEmailVerified(userId: string, email: string): Promise<boolean>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let createEmailVerificationToken: typeof Wrapper.createEmailVerificationToken;
export declare let verifyEmailUsingToken: typeof Wrapper.verifyEmailUsingToken;
export declare let isEmailVerified: typeof Wrapper.isEmailVerified;
