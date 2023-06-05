import { RecipeInterface } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";
import { User } from "../../../types";

export default function getRecipeInterface(recipeInterface: ThirdPartyEmailPasswordRecipeInterface): RecipeInterface {
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
                  status: "SIGN_IN_NOT_ALLOWED";
                  reason: string;
              }
        > {
            return await recipeInterface.thirdPartySignInUp(input);
        },

        createNewOrUpdateEmailOfRecipeUser: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
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
