import { RecipeInterface, User } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyRecipeInterface } from "../types";
export default class RecipeImplementation implements RecipeInterface {
    recipeImplementation: ThirdPartyRecipeInterface;
    constructor(recipeImplementation: ThirdPartyRecipeInterface);
    getUserByThirdPartyInfo: (thirdPartyId: string, thirdPartyUserId: string) => Promise<User | undefined>;
    signInUp: (
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ) => Promise<{
        createdNewUser: boolean;
        user: User;
    }>;
    getUserById: (userId: string) => Promise<User | undefined>;
    getUsersOldestFirst: (_?: number | undefined, __?: string | undefined) => Promise<never>;
    getUsersNewestFirst: (_?: number | undefined, __?: string | undefined) => Promise<never>;
    getUserCount: () => Promise<never>;
}
