// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
import { User, TypeInput, TypeNormalisedInput } from "./types";
import Recipe from "./recipe";
export declare function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput;
/**
 * @deprecated Please do not override this function
 *   */
export declare function createNewPaginationToken(userId: string, timeJoined: number): string;
/**
 * @deprecated Please do not override this function
 *   */
export declare function combinePaginationTokens(
    thirdPartyPaginationToken: string | null,
    emailPasswordPaginationToken: string | null
): string;
/**
 * @deprecated
 *   */
export declare function extractPaginationTokens(
    nextPaginationToken: string
): {
    thirdPartyPaginationToken: string | undefined;
    emailPasswordPaginationToken: string | undefined;
};
/**
 * @deprecated Please do not override this function
 *   */
export declare function combinePaginationResults(
    thirdPartyResult: {
        users: User[];
        nextPaginationToken?: string;
    },
    emailPasswordResult: {
        users: User[];
        nextPaginationToken?: string;
    },
    limit: number,
    oldestFirst: boolean
): {
    users: User[];
    nextPaginationToken?: string;
};
