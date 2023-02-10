import { RecipeInterface, TypeProvider, User } from "../../thirdparty/types";
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
                timeJoined: user.timeJoined,
                thirdParty: user.thirdParty,
                tenantId: user.tenantId,
            };
        },

        signInUp: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            oAuthTokens: { [key: string]: any };
            rawUserInfoFromProvider: {
                fromIdTokenPayload: { [key: string]: any };
                fromUserInfoAPI: { [key: string]: any };
            };
            userContext: any;
        }): Promise<{
            status: "OK";
            createdNewUser: boolean;
            user: User;
            oAuthTokens: { [key: string]: any };
            rawUserInfoFromProvider: {
                fromIdTokenPayload: { [key: string]: any };
                fromUserInfoAPI: { [key: string]: any };
            };
        }> {
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
                    timeJoined: result.user.timeJoined,
                    thirdParty: result.user.thirdParty,
                    tenantId: result.user.tenantId,
                },
                oAuthTokens: result.oAuthTokens,
                rawUserInfoFromProvider: result.rawUserInfoFromProvider,
            };
        },

        manuallyCreateOrUpdateUser: async function (input: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            userContext: any;
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            let result = await recipeInterface.thirdPartyManuallyCreateOrUpdateUser(input);
            if (result.user.thirdParty === undefined) {
                throw new Error("Should never come here");
            }
            return {
                status: "OK",
                createdNewUser: result.createdNewUser,
                user: {
                    email: result.user.email,
                    id: result.user.id,
                    timeJoined: result.user.timeJoined,
                    thirdParty: result.user.thirdParty,
                    tenantId: result.user.tenantId,
                },
            };
        },

        getProvider: async function (input: {
            thirdPartyId: string;
            tenantId?: string;
            clientType?: string;
            userContext: any;
        }): Promise<{ status: "OK"; provider: TypeProvider; thirdPartyEnabled: boolean }> {
            return await recipeInterface.thirdPartyGetProvider(input);
        },

        getUserById: async function (input: { userId: string; userContext: any }): Promise<User | undefined> {
            let user = await recipeInterface.getUserById(input);
            if (user === undefined || user.thirdParty === undefined) {
                // either user is undefined or it's an email password user.
                return undefined;
            }
            return {
                email: user.email,
                id: user.id,
                timeJoined: user.timeJoined,
                thirdParty: user.thirdParty,
                tenantId: user.tenantId,
            };
        },

        getUsersByEmail: async function (input: { email: string; userContext: any }): Promise<User[]> {
            let users = await recipeInterface.getUsersByEmail(input);

            // we filter out all non thirdparty users.
            return users.filter((u) => {
                return u.thirdParty !== undefined;
            }) as User[];
        },
    };
}
