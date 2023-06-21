import { APIInterface } from "../";
import { findAndCreateProviderInstance, mergeProvidersFromCoreAndStatic } from "../../thirdparty/providers/configUtils";

export default function getAPIInterface(): APIInterface {
    return {
        loginMethodsGET: async function ({ tenantId, clientType, options, userContext }) {
            const tenantConfigRes = await options.recipeImplementation.getTenant({
                tenantId,
                userContext,
            });

            const providerInputsFromStatic = options.staticThirdPartyProviders;
            const providerConfigsFromCore = tenantConfigRes.thirdParty.providers;

            const mergedProviders = mergeProvidersFromCoreAndStatic(providerConfigsFromCore, providerInputsFromStatic);

            const finalProviderList: {
                id: string;
                name?: string;
            }[] = [];

            for (const providerInput of mergedProviders) {
                try {
                    const providerInstance = await findAndCreateProviderInstance(
                        mergedProviders,
                        providerInput.config.thirdPartyId,
                        clientType,
                        userContext
                    );
                    finalProviderList.push({
                        id: providerInstance.id,
                        name: providerInstance.config.name,
                    });
                } catch (err) {
                    if (err.type === "CLIENT_TYPE_NOT_FOUND_ERROR") {
                        continue;
                    }
                    throw err;
                }
            }

            return {
                status: "OK",
                emailPassword: {
                    enabled: tenantConfigRes.emailPassword.enabled,
                },
                passwordless: {
                    enabled: tenantConfigRes.passwordless.enabled,
                },
                thirdParty: {
                    enabled: tenantConfigRes.thirdParty.enabled,
                    providers: finalProviderList,
                },
            };
        },
    };
}
