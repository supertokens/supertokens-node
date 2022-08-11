import { RecipeInterface, User } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

export default function getRecipeImplementation(querier: Querier): RecipeInterface {
    return {
        signInUp: async function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
        }: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: {
                id: string;
                isVerified: boolean;
            };
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup"), {
                thirdPartyId,
                thirdPartyUserId,
                email,
            });
            return {
                status: "OK",
                createdNewUser: response.createdNewUser,
                user: response.user,
            };
        },

        getUserById: async function ({ userId }: { userId: string }): Promise<User | undefined> {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
                userId,
            });
            if (response.status === "OK") {
                return {
                    ...response.user,
                };
            } else {
                return undefined;
            }
        },

        getUsersByEmail: async function ({ email }: { email: string }): Promise<User[]> {
            const { users } = await querier.sendGetRequest(new NormalisedURLPath("/recipe/users/by-email"), {
                email,
            });

            return users;
        },

        getUserByThirdPartyInfo: async function ({
            thirdPartyId,
            thirdPartyUserId,
        }: {
            thirdPartyId: string;
            thirdPartyUserId: string;
        }): Promise<User | undefined> {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
                thirdPartyId,
                thirdPartyUserId,
            });
            if (response.status === "OK") {
                return {
                    ...response.user,
                };
            } else {
                return undefined;
            }
        },
    };
}
