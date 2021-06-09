import { RecipeInterface, User } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyRecipeInterface } from "../types";
export default class RecipeImplementation implements RecipeInterface {
    recipeImplementation: ThirdPartyRecipeInterface;
    constructor(recipeImplementation: ThirdPartyRecipeInterface);
    getUserByThirdPartyInfo: (input: { thirdPartyId: string; thirdPartyUserId: string }) => Promise<User | undefined>;
    signInUp: (input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: {
            id: string;
            isVerified: boolean;
        };
    }) => Promise<{
        createdNewUser: boolean;
        user: User;
    }>;
    getUserById: (input: { userId: string }) => Promise<User | undefined>;
    getUsersOldestFirst: (_: {
        limit?: number | undefined;
        nextPaginationToken?: string | undefined;
    }) => Promise<never>;
    getUsersNewestFirst: (_: {
        limit?: number | undefined;
        nextPaginationToken?: string | undefined;
    }) => Promise<never>;
    getUserCount: () => Promise<never>;
}
