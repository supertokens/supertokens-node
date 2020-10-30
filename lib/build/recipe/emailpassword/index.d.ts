import Recipe from "./recipe";
import SuperTokensError from "./error";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static signUp(email: string, password: string): Promise<import("./types").User>;
    static signIn(email: string, password: string): Promise<import("./types").User>;
    static getUserById(userId: string): Promise<import("./types").User | undefined>;
    static getUserByEmail(email: string): Promise<import("./types").User | undefined>;
    static createResetPasswordToken(userId: string): Promise<string>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let signUp: typeof Wrapper.signUp;
export declare let signIn: typeof Wrapper.signIn;
export declare let getUserById: typeof Wrapper.getUserById;
export declare let getUserByEmail: typeof Wrapper.getUserByEmail;
export declare let createResetPasswordToken: typeof Wrapper.createResetPasswordToken;
