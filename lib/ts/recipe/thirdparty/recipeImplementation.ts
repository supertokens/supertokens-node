import { RecipeInterface, User } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import UserIdMappingRecipe from "../useridmapping/recipe";
import { getUserIdMapping } from "./../useridmapping/index";

export default function getRecipeImplementation(querier: Querier): RecipeInterface {
    return {
        signInUp: async function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
            userContext,
        }: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: {
                id: string;
                isVerified: boolean;
            };
            userContext: any;
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup"), {
                thirdPartyId,
                thirdPartyUserId,
                email,
            });

            if (UserIdMappingRecipe.isRecipeInitialized()) {
                let userIdMappingResponse = await getUserIdMapping(response.user.id, "ANY", userContext);
                if (userIdMappingResponse.status === "OK") {
                    response.user.id = userIdMappingResponse.externalUserId;
                }
            }

            return {
                status: "OK",
                createdNewUser: response.createdNewUser,
                user: response.user,
            };
        },

        getUserById: async function ({
            userId,
            userContext,
        }: {
            userId: string;
            userContext: any;
        }): Promise<User | undefined> {
            let externalId = undefined;
            if (UserIdMappingRecipe.isRecipeInitialized()) {
                let userIdMappingResponse = await getUserIdMapping(userId, "ANY", userContext);
                if (userIdMappingResponse.status === "OK") {
                    userId = userIdMappingResponse.superTokensUserId;
                    externalId = userIdMappingResponse.externalUserId;
                }
            }
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
                userId,
            });
            if (response.status === "OK") {
                if (externalId !== undefined) {
                    response.user.id = externalId;
                }
                return {
                    ...response.user,
                };
            } else {
                return undefined;
            }
        },

        getUsersByEmail: async function ({ email, userContext }: { email: string; userContext: any }): Promise<User[]> {
            const { users } = await querier.sendGetRequest(new NormalisedURLPath("/recipe/users/by-email"), {
                email,
            });

            if (UserIdMappingRecipe.isRecipeInitialized()) {
                for (let i = 0; i < users.length; i++) {
                    let userIdMappingResponse = await getUserIdMapping(users[i].id, "ANY", userContext);
                    if (userIdMappingResponse.status === "OK") {
                        users[i].id = userIdMappingResponse.externalUserId;
                    }
                }
            }

            return users;
        },

        getUserByThirdPartyInfo: async function ({
            thirdPartyId,
            thirdPartyUserId,
            userContext,
        }: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            userContext: any;
        }): Promise<User | undefined> {
            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
                thirdPartyId,
                thirdPartyUserId,
            });
            if (response.status === "OK") {
                if (UserIdMappingRecipe.isRecipeInitialized()) {
                    let userIdMappingResponse = await getUserIdMapping(response.user.id, "ANY", userContext);
                    if (userIdMappingResponse.status === "OK") {
                        response.user.id = userIdMappingResponse.externalUserId;
                    }
                }
                return {
                    ...response.user,
                };
            } else {
                return undefined;
            }
        },
    };
}
