// @ts-nocheck
import Recipe from "./recipe";
import type { AccountInfo, AccountInfoWithRecipeId, RecipeInterface } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static getRecipeUserIdsForPrimaryUserIds(
        primaryUserIds: string[],
        userContext: any
    ): Promise<{
        [primaryUserId: string]: string[];
    }>;
    static getPrimaryUserIdsforRecipeUserIds(
        recipeUserIds: string[],
        userContext: any
    ): Promise<{
        [recipeUserId: string]: string | null;
    }>;
    static addNewRecipeUserIdWithoutPrimaryUserId(
        recipeUserId: string,
        recipeId: string,
        timeJoined: number,
        userContext: any
    ): Promise<
        | {
              status: "OK";
              createdNewEntry: boolean;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    static getUsers(
        timeJoinedOrder: "ASC" | "DESC",
        limit: number | undefined,
        paginationToken: string | undefined,
        includeRecipeIds: string[] | undefined,
        userContext: any
    ): Promise<{
        users: import("../../types").User[];
        nextPaginationToken?: string | undefined;
    }>;
    static canCreatePrimaryUserId(
        recipeUserId: string,
        userContext: any
    ): Promise<
        | {
              status: "OK";
          }
        | {
              status:
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    static createPrimaryUser(
        recipeUserId: string,
        userContext: any
    ): Promise<
        | {
              status: "OK";
              user: import("../../types").User;
          }
        | {
              status:
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    static canLinkAccounts(
        recipeUserId: string,
        primaryUserId: string,
        userContext: any
    ): Promise<
        | {
              status: "OK";
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              description: string;
              primaryUserId: string;
          }
        | {
              status: "ACCOUNTS_ALREADY_LINKED_ERROR";
              description: string;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    static linkAccounts(
        recipeUserId: string,
        primaryUserId: string,
        userContext: any
    ): Promise<
        | {
              status: "OK";
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
        | {
              status: "ACCOUNTS_ALREADY_LINKED_ERROR";
              description: string;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    static unlinkAccounts(
        recipeUserId: string,
        userContext: any
    ): Promise<
        | {
              status: "OK";
              wasRecipeUserDeleted: boolean;
          }
        | {
              status: "NO_PRIMARY_USER_FOUND";
          }
    >;
    static getUser(userId: string, userContext: any): Promise<import("../../types").User | undefined>;
    static listUsersByAccountInfo(
        info: AccountInfo,
        userContext: any
    ): Promise<import("../../types").User[] | undefined>;
    static getUserByAccountInfo(
        info: AccountInfoWithRecipeId,
        userContext: any
    ): Promise<import("../../types").User | undefined>;
    static deleteUser(
        userId: string,
        removeAllLinkedAccounts: boolean,
        userContext: any
    ): Promise<{
        status: "OK";
    }>;
}
export declare const init: typeof Recipe.init;
export declare const getRecipeUserIdsForPrimaryUserIds: typeof Wrapper.getRecipeUserIdsForPrimaryUserIds;
export declare const getPrimaryUserIdsforRecipeUserIds: typeof Wrapper.getPrimaryUserIdsforRecipeUserIds;
export declare const addNewRecipeUserIdWithoutPrimaryUserId: typeof Wrapper.addNewRecipeUserIdWithoutPrimaryUserId;
export declare const getUsers: typeof Wrapper.getUsers;
export declare const canCreatePrimaryUserId: typeof Wrapper.canCreatePrimaryUserId;
export declare const createPrimaryUser: typeof Wrapper.createPrimaryUser;
export declare const canLinkAccounts: typeof Wrapper.canLinkAccounts;
export declare const linkAccounts: typeof Wrapper.linkAccounts;
export declare const unlinkAccounts: typeof Wrapper.unlinkAccounts;
export declare const getUser: typeof Wrapper.getUser;
export declare const listUsersByAccountInfo: typeof Wrapper.listUsersByAccountInfo;
export declare const getUserByAccountInfo: typeof Wrapper.getUserByAccountInfo;
export declare const deleteUser: typeof Wrapper.deleteUser;
export type { RecipeInterface };
