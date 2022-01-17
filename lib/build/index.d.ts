// @ts-nocheck
import SuperTokens from "./supertokens";
import SuperTokensError from "./error";
export default class SuperTokensWrapper {
    static init: typeof SuperTokens.init;
    static Error: typeof SuperTokensError;
    static getAllCORSHeaders(): string[];
    static getUserCount(includeRecipeIds?: string[]): Promise<number>;
    static getUsersOldestFirst(input?: {
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
    }): Promise<{
        users: {
            recipeId: string;
            user: any;
        }[];
        nextPaginationToken?: string;
    }>;
    static getUsersNewestFirst(input?: {
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
    }): Promise<{
        users: {
            recipeId: string;
            user: any;
        }[];
        nextPaginationToken?: string;
    }>;
    static deleteUser(
        userId: string
    ): Promise<{
        status: "OK";
    }>;
}
export declare let init: typeof SuperTokens.init;
export declare let getAllCORSHeaders: typeof SuperTokensWrapper.getAllCORSHeaders;
export declare let getUserCount: typeof SuperTokensWrapper.getUserCount;
export declare let getUsersOldestFirst: typeof SuperTokensWrapper.getUsersOldestFirst;
export declare let getUsersNewestFirst: typeof SuperTokensWrapper.getUsersNewestFirst;
export declare let deleteUser: typeof SuperTokensWrapper.deleteUser;
export declare let Error: typeof SuperTokensError;
