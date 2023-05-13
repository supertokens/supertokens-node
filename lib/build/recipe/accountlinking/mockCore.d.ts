// @ts-nocheck
import { AccountInfo, RecipeLevelUser } from "./types";
import type { User } from "../../types";
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
export declare function createUserObject(input: UserWithoutHelperFunctions): User;
export declare function mockListUsersByAccountInfo({ accountInfo }: { accountInfo: AccountInfo }): Promise<User[]>;
export declare function mockGetUser({ userId }: { userId: string }): Promise<User | undefined>;
export declare function mockFetchFromAccountToLinkTable(_: { recipeUserId: string }): Promise<string | undefined>;
export {};
