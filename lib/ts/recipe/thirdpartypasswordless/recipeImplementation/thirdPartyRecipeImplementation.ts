import { RecipeInterface, TypeProvider, User } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyPasswordlessRecipeInterface } from "../types";

export default function getRecipeInterface(recipeInterface: ThirdPartyPasswordlessRecipeInterface): RecipeInterface {
    return {
        getUserByThirdPartyInfo: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            tenantId: string;
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
            oAuthTokens: { [key: string]: any };
            rawUserInfoFromProvider: {
                fromIdTokenPayload?: { [key: string]: any };
                fromUserInfoAPI?: { [key: string]: any };
            };
            tenantId: string;
            userContext: any;
        }): Promise<{
            status: "OK";
            createdNewUser: boolean;
            user: User;
            oAuthTokens: { [key: string]: any };
            rawUserInfoFromProvider: {
                fromIdTokenPayload?: { [key: string]: any };
                fromUserInfoAPI?: { [key: string]: any };
            };
        }> {
            let result = await recipeInterface.thirdPartySignInUp(input);
            if (!("thirdParty" in result.user)) {
                throw new Error("Should never come here");
            }
            return {
                status: "OK",
                createdNewUser: result.createdNewUser,
                user: result.user,
                oAuthTokens: result.oAuthTokens,
                rawUserInfoFromProvider: result.rawUserInfoFromProvider,
            };
        },

        manuallyCreateOrUpdateUser: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            tenantId: string;
            userContext: any;
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            let result = await recipeInterface.thirdPartyManuallyCreateOrUpdateUser(input);
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

        getUserById: async function (input: { userId: string; userContext: any }): Promise<User | undefined> {
            let user = await recipeInterface.getUserById(input);
            if (user === undefined || !("thirdParty" in user)) {
                // either user is undefined or it's an email password user.
                return undefined;
            }
            return user;
        },

        getUsersByEmail: async function (input: {
            email: string;
            tenantId: string;
            userContext: any;
        }): Promise<User[]> {
            let users = await recipeInterface.getUsersByEmail(input);

            // we filter out all non thirdparty users.
            return users.filter((u) => {
                return "thirdParty" in u;
            }) as User[];
        },
    };
}
