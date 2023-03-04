import { RecipeInterface, User } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyPasswordlessRecipeInterface } from "../types";

export default function getRecipeInterface(recipeInterface: ThirdPartyPasswordlessRecipeInterface): RecipeInterface {
    return {
        getUserByThirdPartyInfo: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            userContext: any;
        }): Promise<User | undefined> {
            let user = await recipeInterface.getUserByThirdPartyInfo(input);
            if (user === undefined || !("thirdParty" in user)) {
                return undefined;
            }
            return user;
        },

        signInUp: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            userContext: any;
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            let result = await recipeInterface.thirdPartySignInUp(input);
            if (!("thirdParty" in result.user)) {
                throw new Error("Should never come here");
            }
            return {
                status: "OK",
                createdNewUser: result.createdNewUser,
                user: result.user,
            };
        },

        getUserById: async function (input: { userId: string; userContext: any }): Promise<User | undefined> {
            let user = await recipeInterface.getUserById(input);
            if (user === undefined || !("thirdParty" in user)) {
                // either user is undefined or it's an email password user.
                return undefined;
            }
            return user;
        },

        getUsersByEmail: async function (input: { email: string; userContext: any }): Promise<User[]> {
            let users = await recipeInterface.getUsersByEmail(input);

            // we filter out all non thirdparty users.
            return users.filter((u) => {
                return "thirdParty" in u;
            }) as User[];
        },
    };
}
