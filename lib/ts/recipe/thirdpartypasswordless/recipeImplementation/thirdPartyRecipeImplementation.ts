import { RecipeInterface } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyPasswordlessRecipeInterface } from "../types";
import { User } from "../../../types";

export default function getRecipeInterface(recipeInterface: ThirdPartyPasswordlessRecipeInterface): RecipeInterface {
    return {
        signInUp: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            isVerified: boolean;
            userContext: any;
        }): Promise<
            | { status: "OK"; createdNewUser: boolean; user: User }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
        > {
            return await recipeInterface.thirdPartySignInUp(input);
        },

        createNewOrUpdateEmailOfRecipeUser: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            isVerified: boolean;
            userContext: any;
        }): Promise<
            | { status: "OK"; createdNewUser: boolean; user: User }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
        > {
            return await recipeInterface.createNewOrUpdateEmailOfThirdPartyRecipeUser(input);
        },
    };
}
