// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import type { User, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";
import { SessionContainerInterface } from "../session/types";
export type TypeInput = {
    onAccountLinked?: (user: User, newAccountInfo: RecipeLevelUser, userContext: UserContext) => Promise<void>;
    shouldDoAutomaticAccountLinking?: (
        newAccountInfo: AccountInfoWithRecipeId & {
            recipeUserId?: RecipeUserId;
        },
        user: User | undefined,
        session: SessionContainerInterface | undefined,
        tenantId: string,
        userContext: UserContext
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
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
    };
};
export type TypeNormalisedInput = {
    onAccountLinked: (user: User, newAccountInfo: RecipeLevelUser, userContext: UserContext) => Promise<void>;
    shouldDoAutomaticAccountLinking: (
        newAccountInfo: AccountInfoWithRecipeId & {
            recipeUserId?: RecipeUserId;
        },
        user: User | undefined,
        session: SessionContainerInterface | undefined,
        tenantId: string,
        userContext: UserContext
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
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
    };
};
export type RecipeInterface = {
    getUsers: (input: {
        tenantId: string;
        timeJoinedOrder: "ASC" | "DESC";
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
        query?: {
            [key: string]: string;
        };
        userContext: UserContext;
    }) => Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;
    canCreatePrimaryUser: (input: { recipeUserId: RecipeUserId; userContext: UserContext }) => Promise<
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
    createPrimaryUser: (input: { recipeUserId: RecipeUserId; userContext: UserContext }) => Promise<
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
        userContext: UserContext;
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
    linkAccounts: (input: { recipeUserId: RecipeUserId; primaryUserId: string; userContext: UserContext }) => Promise<
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
    unlinkAccount: (input: { recipeUserId: RecipeUserId; userContext: UserContext }) => Promise<{
        status: "OK";
        wasRecipeUserDeleted: boolean;
        wasLinked: boolean;
    }>;
    getUser: (input: { userId: string; userContext: UserContext }) => Promise<User | undefined>;
    listUsersByAccountInfo: (input: {
        tenantId: string;
        accountInfo: AccountInfoInput;
        doUnionOfAccountInfo: boolean;
        userContext: UserContext;
    }) => Promise<User[]>;
    deleteUser: (input: { userId: string; removeAllLinkedAccounts: boolean; userContext: UserContext }) => Promise<{
        status: "OK";
    }>;
};
export type AccountInfo = {
    email?: string;
    phoneNumber?: string;
    thirdParty?: {
        id: string;
        userId: string;
    };
    webauthn?: {
        credentialIds: string[];
    };
};
export type AccountInfoInput = Omit<AccountInfo, "webauthn"> & {
    webauthn?: {
        credentialId: string;
    };
};
export type AccountInfoWithRecipeId = {
    recipeId: "emailpassword" | "thirdparty" | "passwordless" | "webauthn";
} & AccountInfo;
export type RecipeLevelUser = {
    tenantIds: string[];
    timeJoined: number;
    recipeUserId: RecipeUserId;
} & AccountInfoWithRecipeId;
