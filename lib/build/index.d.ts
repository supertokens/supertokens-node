// @ts-nocheck
import SuperTokens from "./supertokens";
import SuperTokensError from "./error";
import { User as UserType } from "./types";
import { AccountInfo } from "./recipe/accountlinking/types";
import RecipeUserId from "./recipeUserId";
import { User } from "./user";
export default class SuperTokensWrapper {
    static init: typeof SuperTokens.init;
    static Error: typeof SuperTokensError;
    static RecipeUserId: typeof RecipeUserId;
    static User: typeof User;
    static getAllCORSHeaders(): string[];
    static getUserCount(includeRecipeIds?: string[], tenantId?: string, userContext?: any): Promise<number>;
    static getUsersOldestFirst(input: {
        tenantId: string;
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
        query?: {
            [key: string]: string;
        };
        userContext?: any;
    }): Promise<{
        users: UserType[];
        nextPaginationToken?: string;
    }>;
    static getUsersNewestFirst(input: {
        tenantId: string;
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
        query?: {
            [key: string]: string;
        };
        userContext?: any;
    }): Promise<{
        users: UserType[];
        nextPaginationToken?: string;
    }>;
    static createUserIdMapping(input: {
        superTokensUserId: string;
        externalUserId: string;
        externalUserIdInfo?: string;
        force?: boolean;
        userContext?: any;
    }): Promise<
        | {
              status: "OK" | "UNKNOWN_SUPERTOKENS_USER_ID_ERROR";
          }
        | {
              status: "USER_ID_MAPPING_ALREADY_EXISTS_ERROR";
              doesSuperTokensUserIdExist: boolean;
              doesExternalUserIdExist: boolean;
          }
    >;
    static getUserIdMapping(input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        userContext?: any;
    }): Promise<
        | {
              status: "OK";
              superTokensUserId: string;
              externalUserId: string;
              externalUserIdInfo: string | undefined;
          }
        | {
              status: "UNKNOWN_MAPPING_ERROR";
          }
    >;
    static deleteUserIdMapping(input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        force?: boolean;
        userContext?: any;
    }): Promise<{
        status: "OK";
        didMappingExist: boolean;
    }>;
    static updateOrDeleteUserIdMappingInfo(input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        externalUserIdInfo?: string;
        userContext?: any;
    }): Promise<{
        status: "OK" | "UNKNOWN_MAPPING_ERROR";
    }>;
    static getUser(userId: string, userContext?: any): Promise<UserType | undefined>;
    static listUsersByAccountInfo(
        tenantId: string,
        accountInfo: AccountInfo,
        doUnionOfAccountInfo?: boolean,
        userContext?: any
    ): Promise<UserType[]>;
    static deleteUser(
        userId: string,
        removeAllLinkedAccounts?: boolean,
        userContext?: any
    ): Promise<{
        status: "OK";
    }>;
    static convertToRecipeUserId(recipeUserId: string): RecipeUserId;
    static getRequestFromUserContext(userContext: any | undefined): import("./framework").BaseRequest | undefined;
}
export declare let init: typeof SuperTokens.init;
export declare let getAllCORSHeaders: typeof SuperTokensWrapper.getAllCORSHeaders;
export declare let getUserCount: typeof SuperTokensWrapper.getUserCount;
export declare let getUsersOldestFirst: typeof SuperTokensWrapper.getUsersOldestFirst;
export declare let getUsersNewestFirst: typeof SuperTokensWrapper.getUsersNewestFirst;
export declare let deleteUser: typeof SuperTokensWrapper.deleteUser;
export declare let createUserIdMapping: typeof SuperTokensWrapper.createUserIdMapping;
export declare let getUserIdMapping: typeof SuperTokensWrapper.getUserIdMapping;
export declare let deleteUserIdMapping: typeof SuperTokensWrapper.deleteUserIdMapping;
export declare let updateOrDeleteUserIdMappingInfo: typeof SuperTokensWrapper.updateOrDeleteUserIdMappingInfo;
export declare let getUser: typeof SuperTokensWrapper.getUser;
export declare let listUsersByAccountInfo: typeof SuperTokensWrapper.listUsersByAccountInfo;
export declare let convertToRecipeUserId: typeof SuperTokensWrapper.convertToRecipeUserId;
export declare let getRequestFromUserContext: typeof SuperTokensWrapper.getRequestFromUserContext;
export declare let Error: typeof SuperTokensError;
export { default as RecipeUserId } from "./recipeUserId";
export { User } from "./user";
