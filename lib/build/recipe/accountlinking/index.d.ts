// @ts-nocheck
import Recipe from "./recipe";
import type { RecipeInterface } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static getRecipeUserIdsForPrimaryUserIds(
        primaryUserIds: string[],
        userContext?: any
    ): Promise<{
        [primaryUserId: string]: string[];
    }>;
    static getPrimaryUserIdsForRecipeUserIds(
        recipeUserIds: string[],
        userContext?: any
    ): Promise<{
        [recipeUserId: string]: string | null;
    }>;
    static canCreatePrimaryUserId(
        recipeUserId: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              wasAlreadyAPrimaryUser: boolean;
          }
        | {
              status:
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    static createPrimaryUser(
        recipeUserId: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              user: import("../../types").User;
              wasAlreadyAPrimaryUser: boolean;
          }
        | {
              status:
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    static canLinkAccounts(
        recipeUserId: string,
        primaryUserId: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              accountsAlreadyLinked: boolean;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              description: string;
              primaryUserId: string;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    static linkAccounts(
        recipeUserId: string,
        primaryUserId: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              accountsAlreadyLinked: boolean;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    static unlinkAccounts(
        recipeUserId: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              wasRecipeUserDeleted: boolean;
          }
        | {
              status: "PRIMARY_USER_NOT_FOUND_ERROR" | "RECIPE_USER_NOT_FOUND_ERROR";
              description: string;
          }
    >;
    static fetchFromAccountToLinkTable(
        recipeUserId: string,
        userContext?: any
    ): Promise<import("../../types").User | undefined>;
    static storeIntoAccountToLinkTable(
        recipeUserId: string,
        primaryUserId: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              didInsertNewRow: boolean;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
          }
    >;
}
export declare const init: typeof Recipe.init;
export declare const getRecipeUserIdsForPrimaryUserIds: typeof Wrapper.getRecipeUserIdsForPrimaryUserIds;
export declare const getPrimaryUserIdsForRecipeUserIds: typeof Wrapper.getPrimaryUserIdsForRecipeUserIds;
export declare const canCreatePrimaryUserId: typeof Wrapper.canCreatePrimaryUserId;
export declare const createPrimaryUser: typeof Wrapper.createPrimaryUser;
export declare const canLinkAccounts: typeof Wrapper.canLinkAccounts;
export declare const linkAccounts: typeof Wrapper.linkAccounts;
export declare const unlinkAccounts: typeof Wrapper.unlinkAccounts;
export declare const fetchFromAccountToLinkTable: typeof Wrapper.fetchFromAccountToLinkTable;
export declare const storeIntoAccountToLinkTable: typeof Wrapper.storeIntoAccountToLinkTable;
export type { RecipeInterface };
