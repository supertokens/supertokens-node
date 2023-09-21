import { RecipeInterface, TypeProvider } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";
import { User } from "../../../types";
import RecipeUserId from "../../../recipeUserId";

export default function getRecipeInterface(recipeInterface: ThirdPartyEmailPasswordRecipeInterface): RecipeInterface {
    return {
        signInUp: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            isVerified: boolean;
            oAuthTokens: { [key: string]: any };
            rawUserInfoFromProvider: {
                fromIdTokenPayload?: { [key: string]: any };
                fromUserInfoAPI?: { [key: string]: any };
            };
            tenantId: string;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  createdNewRecipeUser: boolean;
                  user: User;
                  recipeUserId: RecipeUserId;
                  oAuthTokens: { [key: string]: any };
                  rawUserInfoFromProvider: {
                      fromIdTokenPayload?: { [key: string]: any };
                      fromUserInfoAPI?: { [key: string]: any };
                  };
              }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
        > {
            return await recipeInterface.thirdPartySignInUp(input);
        },

        manuallyCreateOrUpdateUser: async function (input: {
            tenantId: string;
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            isVerified: boolean;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  createdNewRecipeUser: boolean;
                  user: User;
                  recipeUserId: RecipeUserId;
              }
            | {
                  status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
                  reason: string;
              }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
        > {
            let result = await recipeInterface.thirdPartyManuallyCreateOrUpdateUser(input);
            if (result.status !== "OK") {
                return result;
            }

            if (result.user.thirdParty === undefined) {
                throw new Error("Should never come here");
            }
            return {
                status: "OK",
                createdNewRecipeUser: result.createdNewRecipeUser,
                user: result.user,
                recipeUserId: result.recipeUserId,
            };
        },

        getProvider: async function (input: {
            thirdPartyId: string;
            clientType?: string;
            tenantId: string;
            userContext: any;
        }): Promise<TypeProvider | undefined> {
            return await recipeInterface.thirdPartyGetProvider(input);
        },
    };
}
