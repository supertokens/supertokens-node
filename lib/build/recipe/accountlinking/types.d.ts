// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import type { User } from "../../types";
import RecipeUserId from "../../recipeUserId";
export declare type TypeInput = {
    onAccountLinked?: (user: User, newAccountInfo: RecipeLevelUser, userContext: any) => Promise<void>;
    shouldDoAutomaticAccountLinking?: (
        newAccountInfo: AccountInfoWithRecipeId & {
            recipeUserId?: RecipeUserId;
        },
        user: User | undefined,
        tenantId: string,
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
        newAccountInfo: AccountInfoWithRecipeId & {
            recipeUserId?: RecipeUserId;
        },
        user: User | undefined,
        tenantId: string,
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
    getUsers: (input: {
        tenantId: string;
        timeJoinedOrder: "ASC" | "DESC";
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
        query?: {
            [key: string]: string;
        };
        userContext: any;
    }) => Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;
    canCreatePrimaryUser: (input: {
        recipeUserId: RecipeUserId;
        userContext: any;
    }) => Promise<
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
    createPrimaryUser: (input: {
        recipeUserId: RecipeUserId;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              user: User;
              wasAlreadyAPrimaryUser: boolean;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    canLinkAccounts: (input: {
        recipeUserId: RecipeUserId;
        primaryUserId: string;
        userContext: any;
    }) => Promise<
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
    linkAccounts: (input: {
        recipeUserId: RecipeUserId;
        primaryUserId: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              accountsAlreadyLinked: boolean;
              user: User;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              user: User;
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
    unlinkAccount: (input: {
        recipeUserId: RecipeUserId;
        userContext: any;
    }) => Promise<{
        status: "OK";
        wasRecipeUserDeleted: boolean;
        wasLinked: boolean;
    }>;
    getUser: (input: { userId: string; userContext: any }) => Promise<User | undefined>;
    listUsersByAccountInfo: (input: {
        tenantId: string;
        accountInfo: AccountInfo;
        doUnionOfAccountInfo: boolean;
        userContext: any;
    }) => Promise<User[]>;
    deleteUser: (input: {
        userId: string;
        removeAllLinkedAccounts: boolean;
        userContext: any;
    }) => Promise<{
        status: "OK";
    }>;
};
export declare type AccountInfo = {
    email?: string;
    phoneNumber?: string;
    thirdParty?: {
        id: string;
        userId: string;
    };
};
export declare type AccountInfoWithRecipeId = {
    recipeId: "emailpassword" | "thirdparty" | "passwordless";
} & AccountInfo;
export declare type RecipeLevelUser = {
    tenantIds: string[];
    timeJoined: number;
    recipeUserId: RecipeUserId;
} & AccountInfoWithRecipeId;
