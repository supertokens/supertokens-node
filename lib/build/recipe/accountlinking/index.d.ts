// @ts-nocheck
import { SessionContainer } from "../session";
import Recipe from "./recipe";
import type { AccountInfoAndEmailWithRecipeId, RecipeInterface, RecipeLevelUser } from "./types";
import type { User } from "../../types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static getRecipeUserIdsForPrimaryUserIds(
        primaryUserIds: string[],
        userContext?: any
    ): Promise<{
        [primaryUserId: string]: string[];
    }>;
    static getPrimaryUserIdsforRecipeUserIds(
        recipeUserIds: string[],
        userContext?: any
    ): Promise<{
        [recipeUserId: string]: string | null;
    }>;
    static addNewRecipeUserIdWithoutPrimaryUserId(
        recipeUserId: string,
        recipeId: string,
        timeJoined: number,
        userContext?: any
    ): Promise<{
        status: "OK";
        createdNewEntry: boolean;
    }>;
    static canCreatePrimaryUserId(
        recipeUserId: string,
        userContext?: any
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
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              user: User;
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
        userContext?: any
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
        userContext?: any
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
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              wasRecipeUserDeleted: boolean;
          }
        | {
              status: "NO_PRIMARY_USER_FOUND";
          }
    >;
    static getPrimaryUserIdLinkedOrCanBeLinkedToRecipeUserId(
        recipeUserId: string,
        userContext?: any
    ): Promise<User | undefined>;
    static isSignUpAllowed(info: AccountInfoAndEmailWithRecipeId, userContext: any): Promise<boolean>;
    static doPostSignUpAccountLinkingOperations(
        info: AccountInfoAndEmailWithRecipeId,
        infoVerified: boolean,
        recipeUserId: string,
        userContext: any
    ): Promise<string>;
    static accountLinkPostSignInViaSession(
        session: SessionContainer,
        info: AccountInfoAndEmailWithRecipeId,
        infoVerified: boolean,
        userContext: any
    ): Promise<
        | {
              createRecipeUser: true;
              updateVerificationClaim: boolean;
          }
        | ({
              createRecipeUser: false;
          } & {
              accountsLinked: true;
              updateVerificationClaim: boolean;
          })
        | ({
              createRecipeUser: false;
          } & {
              accountsLinked: false;
              reason:
                  | "ACCOUNT_LINKING_NOT_ALLOWED_ERROR"
                  | "EXISTING_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR"
                  | "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR";
          })
        | ({
              createRecipeUser: false;
          } & {
              accountsLinked: false;
              reason:
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
          })
    >;
    static createPrimaryUserIdOrLinkAccounts(
        recipeUserId: string,
        session: SessionContainer | undefined,
        userContext?: any
    ): Promise<void>;
    static onAccountLinked(user: User, newAccountInfo: RecipeLevelUser, userContext?: any): Promise<void>;
    static shouldDoAutomaticAccountLinking(
        newAccountInfo: AccountInfoAndEmailWithRecipeId,
        user: User | undefined,
        session: SessionContainer | undefined,
        userContext?: any
    ): Promise<
        | {
              shouldAutomaticallyLink: false;
          }
        | {
              shouldAutomaticallyLink: true;
              shouldRequireVerification: boolean;
          }
    >;
    static getIdentitiesForUser(
        user: User
    ): {
        verified: {
            emails: string[];
            phoneNumbers: string[];
            thirdpartyInfo: {
                id: string;
                userId: string;
            }[];
        };
        unverified: {
            emails: string[];
            phoneNumbers: string[];
            thirdpartyInfo: {
                id: string;
                userId: string;
            }[];
        };
    };
}
export declare const init: typeof Recipe.init;
export declare const getRecipeUserIdsForPrimaryUserIds: typeof Wrapper.getRecipeUserIdsForPrimaryUserIds;
export declare const getPrimaryUserIdsforRecipeUserIds: typeof Wrapper.getPrimaryUserIdsforRecipeUserIds;
export declare const addNewRecipeUserIdWithoutPrimaryUserId: typeof Wrapper.addNewRecipeUserIdWithoutPrimaryUserId;
export declare const canCreatePrimaryUserId: typeof Wrapper.canCreatePrimaryUserId;
export declare const createPrimaryUser: typeof Wrapper.createPrimaryUser;
export declare const canLinkAccounts: typeof Wrapper.canLinkAccounts;
export declare const linkAccounts: typeof Wrapper.linkAccounts;
export declare const unlinkAccounts: typeof Wrapper.unlinkAccounts;
export declare const getPrimaryUserIdLinkedOrCanBeLinkedToRecipeUserId: typeof Wrapper.getPrimaryUserIdLinkedOrCanBeLinkedToRecipeUserId;
export declare const isSignUpAllowed: typeof Wrapper.isSignUpAllowed;
export declare const doPostSignUpAccountLinkingOperations: typeof Wrapper.doPostSignUpAccountLinkingOperations;
export declare const accountLinkPostSignInViaSession: typeof Wrapper.accountLinkPostSignInViaSession;
export declare const createPrimaryUserIdOrLinkAccounts: typeof Wrapper.createPrimaryUserIdOrLinkAccounts;
export declare const onAccountLinked: typeof Wrapper.onAccountLinked;
export declare const shouldDoAutomaticAccountLinking: typeof Wrapper.shouldDoAutomaticAccountLinking;
export declare const getIdentitiesForUser: typeof Wrapper.getIdentitiesForUser;
export type { RecipeInterface };
