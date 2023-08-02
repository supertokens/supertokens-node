import { RecipeInterface, TypeProvider } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyPasswordlessRecipeInterface } from "../types";
import { User } from "../../../types";

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

        manuallyCreateOrUpdateUser: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            isVerified: boolean;
            tenantId: string;
            userContext: any;
        }): Promise<
            | { status: "OK"; createdNewUser: boolean; user: User }
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
                createdNewUser: result.createdNewUser,
                user: result.user,
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
