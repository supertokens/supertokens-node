// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import type { User } from "../../types";
import { SessionContainer } from "../session";
export declare type TypeInput = {
    onAccountLinked?: (user: User, newAccountInfo: RecipeLevelUser, userContext: any) => Promise<void>;
    shouldDoAutomaticAccountLinking?: (
        newAccountInfo: AccountInfoAndEmailWithRecipeId,
        user: User | undefined,
        session: SessionContainer | undefined,
        userContext: any
    ) => Promise<
        | {
              shouldAutomaticallyLink: false;
          }
        | {
              shouldAutomaticallyLink: true;
              shouldRequireVerification: boolean;
          }
    >;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
    };
};
export declare type TypeNormalisedInput = {
    onAccountLinked: (user: User, newAccountInfo: RecipeLevelUser, userContext: any) => Promise<void>;
    shouldDoAutomaticAccountLinking: (
        newAccountInfo: AccountInfoAndEmailWithRecipeId,
        user: User | undefined,
        session: SessionContainer | undefined,
        userContext: any
    ) => Promise<
        | {
              shouldAutomaticallyLink: false;
          }
        | {
              shouldAutomaticallyLink: true;
              shouldRequireVerification: boolean;
          }
    >;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
    };
};
export declare type RecipeInterface = {
    getRecipeUserIdsForPrimaryUserIds: (input: {
        primaryUserIds: string[];
        userContext: any;
    }) => Promise<{
        [primaryUserId: string]: string[];
    }>;
    getPrimaryUserIdsForRecipeUserIds: (input: {
        recipeUserIds: string[];
        userContext: any;
    }) => Promise<{
        [recipeUserId: string]: string | null;
    }>;
    addNewRecipeUserIdWithoutPrimaryUserId: (input: {
        recipeUserId: string;
        recipeId: string;
        timeJoined: number;
        userContext: any;
    }) => Promise<{
        status: "OK";
        createdNewEntry: boolean;
    }>;
    getUsers: (input: {
        timeJoinedOrder: "ASC" | "DESC";
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
        userContext: any;
    }) => Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;
    canCreatePrimaryUserId: (input: {
        recipeUserId: string;
        userContext: any;
    }) => Promise<
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
    createPrimaryUser: (input: {
        recipeUserId: string;
        userContext: any;
    }) => Promise<
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
    canLinkAccounts: (input: {
        recipeUserId: string;
        primaryUserId: string;
        userContext: any;
    }) => Promise<
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
    linkAccounts: (input: {
        recipeUserId: string;
        primaryUserId: string;
        userContext: any;
    }) => Promise<
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
    unlinkAccounts: (input: {
        recipeUserId: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              wasRecipeUserDeleted: boolean;
          }
        | {
              status: "NO_PRIMARY_USER_FOUND";
          }
    >;
    getUser: (input: { userId: string; userContext: any }) => Promise<User | undefined>;
    listUsersByAccountInfo: (input: { accountInfo: AccountInfo; userContext: any }) => Promise<User[]>;
    deleteUser: (input: {
        userId: string;
        removeAllLinkedAccounts: boolean;
        userContext: any;
    }) => Promise<{
        status: "OK";
    }>;
    fetchFromAccountToLinkTable: (input: { recipeUserId: string; userContext: any }) => Promise<User | undefined>;
    storeIntoAccountToLinkTable: (input: {
        recipeUserId: string;
        primaryUserId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
    }>;
};
export declare type RecipeLevelUser = {
    recipeId: "emailpassword" | "thirdparty" | "passwordless";
    id: string;
    timeJoined: number;
    recipeUserId: string;
    email?: string;
    phoneNumber?: string;
    thirdParty?: {
        id: string;
        userId: string;
    };
};
export declare type AccountInfoAndEmailWithRecipeId = {
    recipeId: "emailpassword" | "thirdparty" | "passwordless";
    email?: string;
    phoneNumber?: string;
    thirdParty?: {
        id: string;
        userId: string;
    };
};
export declare type AccountInfo =
    | {
          email: string;
      }
    | {
          phoneNumber: string;
      }
    | {
          thirdPartyId: string;
          thirdPartyUserId: string;
      };
