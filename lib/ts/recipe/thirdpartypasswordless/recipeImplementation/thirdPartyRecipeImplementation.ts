import { RecipeInterface, TypeProvider } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyPasswordlessRecipeInterface } from "../types";
import { User, UserContext } from "../../../types";
import RecipeUserId from "../../../recipeUserId";
import { SessionContainerInterface } from "../../session/types";

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
            session: SessionContainerInterface | undefined;
            tenantId: string;
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
            | {
                  status: "LINKING_TO_SESSION_USER_FAILED";
                  reason:
                      | "EMAIL_VERIFICATION_REQUIRED"
                      | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              }
        > {
            return await recipeInterface.thirdPartySignInUp(input);
        },

        manuallyCreateOrUpdateUser: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            isVerified: boolean;
            session: SessionContainerInterface | undefined;
            tenantId: string;
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
            | {
                  status: "LINKING_TO_SESSION_USER_FAILED";
                  reason:
                      | "EMAIL_VERIFICATION_REQUIRED"
                      | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
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
