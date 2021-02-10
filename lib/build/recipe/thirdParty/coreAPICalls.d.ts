import Recipe from "./recipe";
import { User } from "./types";
export declare function signInUp(recipeInstance: Recipe, thirdPartyId: string, thirdPartyUserId: string, email: {
    id: string;
    isVerified: boolean;
}): Promise<{
    isNewUser: boolean;
    user: User;
} | undefined>;
export declare function getUserById(recipeInstance: Recipe, userId: string): Promise<User | undefined>;
export declare function getUserByThirdPartyInfo(recipeInstance: Recipe, thirdPartyId: string, thirdPartyUserId: string): Promise<User | undefined>;
export declare function getUsers(recipeInstance: Recipe, timeJoinedOrder: "ASC" | "DESC", limit?: number, paginationToken?: string): Promise<{
    users: User[];
    nextPaginationToken?: string;
}>;
export declare function getUsersCount(recipeInstance: Recipe): Promise<number>;
