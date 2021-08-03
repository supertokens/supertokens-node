import { RecipeInterface, User } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyRecipeInterface } from "../types";

export default class RecipeImplementation implements RecipeInterface {
    recipeImplementation: ThirdPartyRecipeInterface;

    constructor(recipeImplementation: ThirdPartyRecipeInterface) {
        this.recipeImplementation = recipeImplementation;
    }

    getUsersByEmail(input: { email: string }): Promise<User[]> {
        return this.recipeImplementation.getThirdPartyUsersByEmail(input);
    }

    getUserByThirdPartyInfo = async (input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
    }): Promise<User | undefined> => {
        let user = await this.recipeImplementation.getUserByThirdPartyInfo(input);
        if (user === undefined || user.thirdParty === undefined) {
            return undefined;
        }
        return {
            email: user.email,
            id: user.id,
            timeJoined: user.timeJoined,
            thirdParty: user.thirdParty,
        };
    };

    signInUp = async (input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: {
            id: string;
            isVerified: boolean;
        };
    }): Promise<
        | { status: "OK"; createdNewUser: boolean; user: User }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    > => {
        let result = await this.recipeImplementation.signInUp(input);
        if (result.status === "FIELD_ERROR") {
            return result;
        }
        if (result.user.thirdParty === undefined) {
            throw new Error("Should never come here");
        }
        return {
            status: "OK",
            createdNewUser: result.createdNewUser,
            user: {
                email: result.user.email,
                id: result.user.id,
                timeJoined: result.user.timeJoined,
                thirdParty: result.user.thirdParty,
            },
        };
    };

    getUserById = async (input: { userId: string }): Promise<User | undefined> => {
        let user = await this.recipeImplementation.getUserById(input);
        if (user === undefined || user.thirdParty === undefined) {
            // either user is undefined or it's an email password user.
            return undefined;
        }
        return {
            email: user.email,
            id: user.id,
            timeJoined: user.timeJoined,
            thirdParty: user.thirdParty,
        };
    };

    /**
     * @deprecated
     *   */
    getUsersOldestFirst = async (_: { limit?: number; nextPaginationToken?: string }) => {
        throw new Error("Should never be called");
    };

    /**
     * @deprecated
     *   */
    getUsersNewestFirst = async (_: { limit?: number; nextPaginationToken?: string }) => {
        throw new Error("Should never be called");
    };

    /**
     * @deprecated
     *   */
    getUserCount = async () => {
        throw new Error("Should never be called");
    };
}
