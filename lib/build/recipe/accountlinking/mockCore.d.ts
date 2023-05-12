// @ts-nocheck
import { AccountInfo } from "./types";
import type { User } from "../../types";
export declare function mockListUsersByAccountInfo({ accountInfo }: { accountInfo: AccountInfo }): Promise<User[]>;
export declare function mockGetUser({ userId }: { userId: string }): Promise<User | undefined>;
export declare function mockFetchFromAccountToLinkTable(_: { recipeUserId: string }): Promise<string | undefined>;
