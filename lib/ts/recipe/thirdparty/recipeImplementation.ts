import { RecipeInterface, User, ProviderInput } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { findAndCreateProviderInstance, mergeConfig } from "./utils";

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

        getProvider: async function ({ thirdPartyId, tenantId, userContext }) {
            const tenantConfig = await multitenancy.getTenantConfig({ tenantId, userContext }); // FIXME

            let mergedProviders: ProviderInput[] = [];

            if (tenantConfig.providers) {
                mergedProviders = tenantConfig.providers;
            } else {
                for (const providerConfigFromCore of tenantConfig.thirdParty.providers) {
                    let mergedProviderInput: ProviderInput = {
                        config: providerConfigFromCore,
                    };

                    for (const providerInputFromStatic of providers) {
                        if (providerInputFromStatic.config.thirdPartyId === providerConfigFromCore.thirdPartyId) {
                            mergedProviderInput.config = mergeConfig(
                                providerInputFromStatic.config,
                                providerConfigFromCore
                            );
                        }
                    }
                    mergedProviders.push(mergedProviderInput);
                }
            }

            const provider = findAndCreateProviderInstance(mergedProviders, thirdPartyId);
            return {
                status: "OK",
                provider,
                thirdPartyEnabled: tenantConfig.thirdParty.enabled,
            };
        },
    };
}
