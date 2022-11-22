// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import { User } from "../../types";
import { SessionContainer } from "../session";
export declare type TypeInput = {
    onAccountLinked?: (user: User, newAccountInfo: RecipeLevelUser, userContext: any) => Promise<void>;
    onAccountUnlinked?: (user: User, unlinkedAccount: RecipeLevelUser, userContext: any) => Promise<void>;
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
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    onAccountLinked: (user: User, newAccountInfo: RecipeLevelUser, userContext: any) => Promise<void>;
    onAccountUnlinked: (user: User, unlinkedAccount: RecipeLevelUser, userContext: any) => Promise<void>;
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
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type APIInterface = {};
export declare type RecipeInterface = {
    canCreatePrimaryUserId: (input: {
        recipeUserId: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
          }
        | {
              status:
                  | "PRIMARY_USER_ALREADY_EXISTS_FOR_RECIPE_USER_ID_ERROR"
                  | "PRIMARY_USER_ALREADY_EXISTS_FOR_ACCOUNT_INFO_ERROR";
              primaryUserId: string;
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
                  | "PRIMARY_USER_ALREADY_EXISTS_FOR_RECIPE_USER_ID_ERROR"
                  | "PRIMARY_USER_ALREADY_EXISTS_FOR_ACCOUNT_INFO_ERROR";
              primaryUserId: string;
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
              primaryUserId: string;
          }
        | {
              status: "ACCOUNTS_ALREADY_LINKED_ERROR";
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
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
          }
        | {
              status: "ACCOUNTS_ALREADY_LINKED_ERROR";
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
          }
    >;
    unlinkAccounts: (input: {
        recipeUserId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        wasRecipeUserDeleted: boolean;
    }>;
};
declare type RecipeLevelUser = {
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
export {};
