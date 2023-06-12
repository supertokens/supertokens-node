// @ts-nocheck
import Recipe from "./recipe";
import type { RecipeInterface, AccountInfoWithRecipeId } from "./types";
import { SessionContainerInterface } from "../session/types";
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
    /**
     * This function is similar to linkAccounts, but it specifically
     * works for when trying to link accounts with a user that you are already logged
     * into. This can be used to implement, for example, connecting social accounts to your *
     * existing email password account.
     *
     * This function also creates a new recipe user for the newUser if required, and for that,
     * it allows you to provide two functions:
     *  - createRecipeUserFunc: Used to create a new account for newUser
     *  - verifyCredentialsFunc: If the new account already exists, this function will be called
     *      and you can verify the input credentials before we attempt linking. If the input
     *      credentials are not OK, then you can return a `CUSTOM_RESPONSE` status and that
     *      will be returned back to you from this function call.
     */
    static linkAccountsWithUserFromSession<T>(input: {
        session: SessionContainerInterface;
        newUser: AccountInfoWithRecipeId;
        createRecipeUserFunc: (userContext: any) => Promise<void>;
        verifyCredentialsFunc: (
            userContext: any
        ) => Promise<
            | {
                  status: "OK";
              }
            | {
                  status: "CUSTOM_RESPONSE";
                  resp: T;
              }
        >;
        userContext?: any;
    }): Promise<
        | {
              status: "OK";
              wereAccountsAlreadyLinked: boolean;
          }
        | {
              status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
              description: string;
          }
        | {
              status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR";
              primaryUserId: string;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "CUSTOM_RESPONSE";
              resp: T;
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
    >;
    static linkAccounts(
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
export declare const linkAccountsWithUserFromSession: typeof Wrapper.linkAccountsWithUserFromSession;
export declare const isSignUpAllowed: typeof Wrapper.isSignUpAllowed;
export declare const isSignInAllowed: typeof Wrapper.isSignInAllowed;
export type { RecipeInterface };
