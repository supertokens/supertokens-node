import { RecipeInterface, User } from "./types";
import {
    getUsers as getUsersCore,
    getUsersCount as getUsersCountCore,
    getUserById as getUserByIdFromCore,
    getUserByThirdPartyInfo as getUserByThirdPartyInfoFromCore,
    signInUp as signInUpFromCore,
} from "./coreAPICalls";
import Recipe from "./recipe";

export default class RecipeImplementation implements RecipeInterface {
    recipeInstance: Recipe;
    constructor(recipeInstance: Recipe) {
        this.recipeInstance = recipeInstance;
    }

    getUsersOldestFirst = async (limit?: number, nextPaginationToken?: string) => {
        return getUsersCore(this.recipeInstance, "ASC", limit, nextPaginationToken);
    };

    getUsersNewestFirst = async (limit?: number, nextPaginationToken?: string) => {
        return getUsersCore(this.recipeInstance, "DESC", limit, nextPaginationToken);
    };

    getUserCount = async () => {
        return getUsersCountCore(this.recipeInstance);
    };

    signInUp = async (
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ): Promise<{ createdNewUser: boolean; user: User }> => {
        return await signInUpFromCore(this.recipeInstance, thirdPartyId, thirdPartyUserId, email);
    };

    getUserById = async (userId: string): Promise<User | undefined> => {
        return getUserByIdFromCore(this.recipeInstance, userId);
    };

    getUserByThirdPartyInfo = async (thirdPartyId: string, thirdPartyUserId: string): Promise<User | undefined> => {
        return getUserByThirdPartyInfoFromCore(this.recipeInstance, thirdPartyId, thirdPartyUserId);
    };
}
