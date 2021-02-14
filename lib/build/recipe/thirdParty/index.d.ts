import Recipe from "./recipe";
import SuperTokensError from "./error";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static signInUp(thirdPartyId: string, thirdPartyUserId: string, email: {
        id: string;
        isVerified: boolean;
    }): Promise<{
        createdNewUser: boolean;
        user: import("./types").User;
    }>;
    static getUserById(userId: string): Promise<import("./types").User | undefined>;
    static getUserByThirdPartyInfo(thirdPartyId: string, thirdPartyUserId: string): Promise<import("./types").User | undefined>;
    static getUsersOldestFirst(limit?: number, nextPaginationToken?: string): Promise<{
        users: import("./types").User[];
        nextPaginationToken?: string | undefined;
    }>;
    static getUsersNewestFirst(limit?: number, nextPaginationToken?: string): Promise<{
        users: import("./types").User[];
        nextPaginationToken?: string | undefined;
    }>;
    static getUserCount(): Promise<number>;
    static createEmailVerificationToken(userId: string): Promise<string>;
    static verifyEmailUsingToken(token: string): Promise<import("../emailverification/types").User>;
    static isEmailVerified(userId: string): Promise<boolean>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let signInUp: typeof Wrapper.signInUp;
export declare let getUserById: typeof Wrapper.getUserById;
export declare let getUserByThirdPartyInfo: typeof Wrapper.getUserByThirdPartyInfo;
export declare let createEmailVerificationToken: typeof Wrapper.createEmailVerificationToken;
export declare let verifyEmailUsingToken: typeof Wrapper.verifyEmailUsingToken;
export declare let isEmailVerified: typeof Wrapper.isEmailVerified;
export declare let getUsersOldestFirst: typeof Wrapper.getUsersOldestFirst;
export declare let getUsersNewestFirst: typeof Wrapper.getUsersNewestFirst;
export declare let getUserCount: typeof Wrapper.getUserCount;
