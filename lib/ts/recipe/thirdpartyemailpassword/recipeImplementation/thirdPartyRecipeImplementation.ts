import { RecipeInterface, User } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";

export default function getRecipeInterface(recipeInterface: ThirdPartyEmailPasswordRecipeInterface): RecipeInterface {
    return {
        getUserByThirdPartyInfo: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            userContext: any;
        }): Promise<User | undefined> {
            let user = await recipeInterface.getUserByThirdPartyInfo(input);
            if (user === undefined || user.thirdParty === undefined) {
                return undefined;
            }
            return {
                email: user.email,
                id: user.id,
                recipeUserId: user.recipeUserId,
                timeJoined: user.timeJoined,
                thirdParty: user.thirdParty,
            };
        },

        signInUp: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            userContext: any;
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            let result = await recipeInterface.thirdPartySignInUp(input);
            if (result.user.thirdParty === undefined) {
                throw new Error("Should never come here");
            }
            return {
                status: "OK",
                createdNewUser: result.createdNewUser,
                user: {
                    email: result.user.email,
                    id: result.user.id,
                    recipeUserId: result.user.recipeUserId,
                    timeJoined: result.user.timeJoined,
                    thirdParty: result.user.thirdParty,
                },
            };
        },

        getUserById: async function (_: { userId: string; userContext: any }): Promise<User | undefined> {
            throw new Error("This will be removed..");
        },

        getUsersByEmail: async function (_: { email: string; userContext: any }): Promise<User[]> {
            throw new Error("This will be removed..");
        },
    };
}
