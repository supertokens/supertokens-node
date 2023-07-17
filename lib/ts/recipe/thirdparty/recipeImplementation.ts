import { RecipeInterface, User, ProviderInput } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { findAndCreateProviderInstance, mergeProvidersFromCoreAndStatic } from "./providers/configUtils";
import MultitenancyRecipe from "../multitenancy/recipe";
import STError from "./error";

export default function getRecipeImplementation(querier: Querier, providers: ProviderInput[]): RecipeInterface {
    return {
        signInUp: async function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
            oAuthTokens,
            rawUserInfoFromProvider,
            tenantId,
        }: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            oAuthTokens: { [key: string]: any };
            rawUserInfoFromProvider: {
                fromIdTokenPayload?: { [key: string]: any };
                fromUserInfoAPI?: { [key: string]: any };
            };
            tenantId: string;
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
            let response = await querier.sendPostRequest(new NormalisedURLPath(`/${tenantId}/recipe/signinup`), {
                thirdPartyId,
                thirdPartyUserId,
                email: { id: email },
            });
            return {
                status: "OK",
                createdNewUser: response.createdNewUser,
                user: response.user,
                oAuthTokens,
                rawUserInfoFromProvider,
            };
        },

        manuallyCreateOrUpdateUser: async function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
            tenantId,
        }: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
            tenantId: string;
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            let response = await querier.sendPostRequest(new NormalisedURLPath(`/${tenantId}/recipe/signinup`), {
                thirdPartyId,
                thirdPartyUserId,
                email: { id: email },
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
                return response.user;
            } else {
                return undefined;
            }
        },

        getUsersByEmail: async function ({ email, tenantId }: { email: string; tenantId: string }): Promise<User[]> {
            let users: User[] = [];
            users = (
                await querier.sendGetRequest(new NormalisedURLPath(`/${tenantId}/recipe/users/by-email`), {
                    email,
                })
            ).users;

            return users;
        },

        getUserByThirdPartyInfo: async function ({
            thirdPartyId,
            thirdPartyUserId,
            tenantId,
        }: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            tenantId: string;
        }): Promise<User | undefined> {
            let response = await querier.sendGetRequest(new NormalisedURLPath(`/${tenantId}/recipe/user`), {
                thirdPartyId,
                thirdPartyUserId,
            });
            if (response.status === "OK") {
                return response.user;
            } else {
                return undefined;
            }
        },

        getProvider: async function ({ thirdPartyId, tenantId, clientType, userContext }) {
            const mtRecipe = MultitenancyRecipe.getInstanceOrThrowError();
            const tenantConfig = await mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext });

            if (tenantConfig.status === "TENANT_NOT_FOUND_ERROR") {
                throw new STError({
                    type: "BAD_INPUT_ERROR",
                    message: "Tenant not found",
                });
            }

            const mergedProviders: ProviderInput[] = mergeProvidersFromCoreAndStatic(
                tenantConfig.thirdParty.providers,
                providers
            );

            const provider = await findAndCreateProviderInstance(
                mergedProviders,
                thirdPartyId,
                clientType,
                userContext
            );
            return {
                status: "OK",
                provider,
            };
        },
    };
}
