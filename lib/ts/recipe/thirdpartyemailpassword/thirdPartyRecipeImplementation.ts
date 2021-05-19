import { RecipeInterface, User } from "../thirdparty/types";
import STError from "./error";
import Recipe from "./recipe";

export default class RecipeImplementation implements RecipeInterface {
    recipeInstance: Recipe;

    constructor(recipeInstance: Recipe) {
        this.recipeInstance = recipeInstance;
    }

    getUserByThirdPartyInfo = async (thirdPartyId: string, thirdPartyUserId: string): Promise<User | undefined> => {
        let user = await this.recipeInstance.recipeInterfaceImpl.getUserByThirdPartyInfo(
            thirdPartyId,
            thirdPartyUserId
        );
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

    signInUp = async (
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ): Promise<{ createdNewUser: boolean; user: User }> => {
        let result = await this.recipeInstance.recipeInterfaceImpl.signInUp(thirdPartyId, thirdPartyUserId, email);
        if (result.user.thirdParty === undefined) {
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: new Error("Should never come here"),
                },
                this.recipeInstance
            );
        }
        return {
            createdNewUser: result.createdNewUser,
            user: {
                email: result.user.email,
                id: result.user.id,
                timeJoined: result.user.timeJoined,
                thirdParty: result.user.thirdParty,
            },
        };
    };

    getUserById = async (userId: string): Promise<User | undefined> => {
        let user = await this.recipeInstance.recipeInterfaceImpl.getUserById(userId);
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

    getUsersOldestFirst = async (_?: number, __?: string) => {
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Should never be called"),
            },
            this.recipeInstance
        );
    };

    getUsersNewestFirst = async (_?: number, __?: string) => {
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Should never be called"),
            },
            this.recipeInstance
        );
    };

    getUserCount = async () => {
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Should never be called"),
            },
            this.recipeInstance
        );
    };
}
