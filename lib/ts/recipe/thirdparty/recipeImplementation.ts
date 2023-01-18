import { RecipeInterface, User, ProviderInput } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { findAndCreateProviderInstance, mergeProvidersFromCoreAndStatic } from "./providers/configUtils";
import { updateTenantId } from "./utils";
import MultitenancyRecipe from "../multitenancy/recipe";

export default function getRecipeImplementation(querier: Querier, providers: ProviderInput[]): RecipeInterface {
    return {
        signInUp: async function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
        }: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup"), {
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

        manuallyCreateOrUpdateUser: async function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
        }: {
            thirdPartyId: string;
            thirdPartyUserId: string;
            email: string;
        }): Promise<{ status: "OK"; createdNewUser: boolean; user: User }> {
            let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup"), {
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
            const user = updateTenantId(response.user);
            if (response.status === "OK") {
                return {
                    ...user,
                };
            } else {
                return undefined;
            }
        },

        getUsersByEmail: async function ({ email }: { email: string }): Promise<User[]> {
            let users: User[] = [];
            users = (
                await querier.sendGetRequest(new NormalisedURLPath("/recipe/users/by-email"), {
                    email,
                })
            ).users;
            users = users.map(updateTenantId);

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
                const user = updateTenantId(response.user);
                return {
                    ...user,
                };
            } else {
                return undefined;
            }
        },

        getProvider: async function ({ thirdPartyId, tenantId, clientType, userContext }) {
            const mtRecipe = MultitenancyRecipe.getInstanceOrThrowError();
            const tenantConfig = await mtRecipe.recipeInterfaceImpl.getTenantConfig({ tenantId, userContext });

            const mergedProviders: ProviderInput[] = mergeProvidersFromCoreAndStatic(
                tenantId,
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
                thirdPartyEnabled: tenantConfig.thirdParty.enabled,
            };
        },
    };
}
