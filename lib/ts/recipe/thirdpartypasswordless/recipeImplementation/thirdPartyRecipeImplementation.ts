import { RecipeInterface, TypeProvider } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyPasswordlessRecipeInterface } from "../types";
import { User, UserContext } from "../../../types";
import RecipeUserId from "../../../recipeUserId";

export default function getRecipeInterface(recipeInterface: ThirdPartyPasswordlessRecipeInterface): RecipeInterface {
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
            shouldAttemptAccountLinkingIfAllowed: boolean;
            userContext: UserContext;
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
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            isVerified: boolean;
            tenantId: string;
            shouldAttemptAccountLinkingIfAllowed: boolean;
            userContext: UserContext;
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
            if (!("thirdParty" in result.user)) {
                throw new Error("Should never come here");
            }
            return {
                status: "OK",
                createdNewRecipeUser: result.createdNewRecipeUser,
                recipeUserId: result.recipeUserId,
                user: result.user,
            };
        },

        getProvider: async function (input: {
            thirdPartyId: string;
            clientType?: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<TypeProvider | undefined> {
            return await recipeInterface.thirdPartyGetProvider(input);
        },
    };
}
