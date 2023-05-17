// @ts-nocheck
import { AccountInfo, RecipeLevelUser } from "./types";
import type { User } from "../../types";
import { Querier } from "../../querier";
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
export declare function mockGetUser({ userId }: { userId: string }): Promise<User | undefined>;
export declare function mockFetchFromAccountToLinkTable(_: { recipeUserId: string }): Promise<string | undefined>;
export {};
