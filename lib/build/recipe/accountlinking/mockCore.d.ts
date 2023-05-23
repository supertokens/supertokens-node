// @ts-nocheck
import { AccountInfo, RecipeLevelUser } from "./types";
import type { User } from "../../types";
import { Querier } from "../../querier";
import RecipeUserId from "../../recipeUserId";
declare type UserWithoutHelperFunctions = {
    id: string;
    timeJoined: number;
    isPrimaryUser: boolean;
    emails: string[];
    phoneNumbers: string[];
    thirdParty: {
        id: string;
        userId: string;
    }[];
    loginMethods: (RecipeLevelUser & {
        verified: boolean;
    })[];
    normalizedInputMap: {
        [key: string]: string | undefined;
    };
};
export declare function mockCanLinkAccounts({
    recipeUserId,
    primaryUserId,
}: {
    recipeUserId: RecipeUserId;
    primaryUserId: string;
}): Promise<
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
export declare function mockLinkAccounts({
    recipeUserId,
    primaryUserId,
}: {
    recipeUserId: RecipeUserId;
    primaryUserId: string;
}): Promise<
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
export declare function mockCanCreatePrimaryUser(
    recipeUserId: RecipeUserId
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
export declare function mockCreatePrimaryUser(
    recipeUserId: RecipeUserId
): Promise<
    | {
          status: "OK";
          user: User;
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
export declare function mockGetUsers(
    querier: Querier,
    input: {
        timeJoinedOrder: "ASC" | "DESC";
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
        query?: {
            [key: string]: string;
        };
    }
): Promise<{
    users: User[];
    nextPaginationToken?: string;
}>;
export declare function createUserObject(input: UserWithoutHelperFunctions): User;
export declare function mockListUsersByAccountInfo({ accountInfo }: { accountInfo: AccountInfo }): Promise<User[]>;
export declare function mockGetUser({
    userId,
    normalizedInputMap,
}: {
    userId: string;
    normalizedInputMap?: {
        [key: string]: string;
    };
}): Promise<User | undefined>;
export declare function mockFetchFromAccountToLinkTable(input: {
    recipeUserId: RecipeUserId;
}): Promise<string | undefined>;
export declare function mockStoreIntoAccountToLinkTable(input: {
    recipeUserId: RecipeUserId;
    primaryUserId: string;
}): Promise<
    | {
          status: "OK";
          didInsertNewRow: boolean;
      }
    | {
          status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
          primaryUserId: string;
      }
>;
export declare function mockUnlinkAccounts({
    recipeUserId,
    querier,
}: {
    recipeUserId: RecipeUserId;
    querier: Querier;
}): Promise<{
    status: "OK";
    wasRecipeUserDeleted: boolean;
}>;
export declare function mockDeleteUser({
    userId,
    removeAllLinkedAccounts,
    querier,
}: {
    userId: string;
    removeAllLinkedAccounts: boolean;
    querier: Querier;
}): Promise<{
    status: "OK";
}>;
export {};
