// @ts-nocheck
import Recipe from "./recipe";
import type { RecipeInterface, AccountInfoWithRecipeId } from "./types";
import RecipeUserId from "../../recipeUserId";
export default class Wrapper {
    static init: typeof Recipe.init;
    /**
     * This is a function which is a combination of createPrimaryUser and
     * linkAccounts where the input recipeUserID is either linked to a user that it can be
     * linked to, or is made into a primary user.
     *
     * The output will be the user ID of the user that it was linked to, or it will be the
     * same as the input recipeUserID if it was made into a primary user, or if there was
     * no linking that happened.
     */
    static createPrimaryUserIdOrLinkAccounts(input: {
        tenantId: string;
        recipeUserId: RecipeUserId;
        checkAccountsToLinkTableAsWell?: boolean;
        userContext?: any;
    }): Promise<string>;
    /**
     * This function returns the primary user that the input recipe ID can be
     * linked to. It can be used to determine which primary account the linking
     * will happen to if the input recipe user ID was to be linked.
     *
     * If the function returns undefined, it means that there is no primary user
     * that the input recipe ID can be linked to, and therefore it can be made
     * into a primary user itself.
     */
    static getPrimaryUserIdThatCanBeLinkedToRecipeUserId(input: {
        recipeUserId: RecipeUserId;
        checkAccountsToLinkTableAsWell?: boolean;
        userContext?: any;
    }): Promise<import("../emailpassword").User | undefined>;
    static canCreatePrimaryUser(
        recipeUserId: RecipeUserId,
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
        recipeUserId: RecipeUserId,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              user: import("../emailpassword").User;
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
        recipeUserId: RecipeUserId,
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
        | {
              status: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
          }
    >;
    static linkAccounts(
        tenantId: string,
        recipeUserId: RecipeUserId,
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
        | {
              status: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
          }
    >;
    static unlinkAccount(
        recipeUserId: RecipeUserId,
        userContext?: any
    ): Promise<{
        status: "OK";
        wasRecipeUserDeleted: boolean;
    }>;
    static fetchFromAccountToLinkTable(recipeUserId: RecipeUserId, userContext?: any): Promise<string | undefined>;
    static storeIntoAccountToLinkTable(
        recipeUserId: RecipeUserId,
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
        | {
              status: "INPUT_USER_ID_IS_NOT_A_PRIMARY_USER_ERROR";
          }
    >;
    static isSignUpAllowed(newUser: AccountInfoWithRecipeId, isVerified: boolean, userContext?: any): Promise<boolean>;
    static isSignInAllowed(recipeUserId: RecipeUserId, userContext?: any): Promise<boolean>;
    static isEmailChangeAllowed(
        recipeUserId: RecipeUserId,
        newEmail: string,
        isVerified: boolean,
        userContext?: any
    ): Promise<boolean>;
}
export declare const init: typeof Recipe.init;
export declare const canCreatePrimaryUser: typeof Wrapper.canCreatePrimaryUser;
export declare const createPrimaryUser: typeof Wrapper.createPrimaryUser;
export declare const canLinkAccounts: typeof Wrapper.canLinkAccounts;
export declare const linkAccounts: typeof Wrapper.linkAccounts;
export declare const unlinkAccount: typeof Wrapper.unlinkAccount;
export declare const fetchFromAccountToLinkTable: typeof Wrapper.fetchFromAccountToLinkTable;
export declare const storeIntoAccountToLinkTable: typeof Wrapper.storeIntoAccountToLinkTable;
export declare const createPrimaryUserIdOrLinkAccounts: typeof Wrapper.createPrimaryUserIdOrLinkAccounts;
export declare const getPrimaryUserIdThatCanBeLinkedToRecipeUserId: typeof Wrapper.getPrimaryUserIdThatCanBeLinkedToRecipeUserId;
export declare const isSignUpAllowed: typeof Wrapper.isSignUpAllowed;
export declare const isSignInAllowed: typeof Wrapper.isSignInAllowed;
export declare const isEmailChangeAllowed: typeof Wrapper.isEmailChangeAllowed;
export type { RecipeInterface };
