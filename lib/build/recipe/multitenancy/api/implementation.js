"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configUtils_1 = require("../../thirdparty/providers/configUtils");
function getAPIInterface() {
    return {
        loginMethodsGET: async function ({ tenantId, clientType, options, userContext }) {
            const tenantConfigRes = await options.recipeImplementation.getTenant({
                tenantId,
                userContext,
            });
            if (tenantConfigRes === undefined) {
                throw new Error("Tenant not found");
            }
            const providerInputsFromStatic = options.staticThirdPartyProviders;
            const providerConfigsFromCore = tenantConfigRes.thirdParty.providers;
            const mergedProviders = configUtils_1.mergeProvidersFromCoreAndStatic(
                providerConfigsFromCore,
                providerInputsFromStatic
            );
            const finalProviderList = [];
            for (const providerInput of mergedProviders) {
                try {
                    const providerInstance = await configUtils_1.findAndCreateProviderInstance(
                        mergedProviders,
                        providerInput.config.thirdPartyId,
                        clientType,
                        userContext
                    );
                    if (providerInstance === undefined) {
                        throw new Error("should never come here"); // because creating instance from the merged provider list itself
                    }
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
            let firstFactors = undefined;
            if (tenantConfigRes.firstFactors !== undefined) {
                firstFactors = tenantConfigRes.firstFactors;
            } else if (options.staticFirstFactors !== undefined) {
                firstFactors = options.staticFirstFactors;
                // Filter based on enabled recipes
                if (tenantConfigRes.emailPassword.enabled === false) {
                    firstFactors = firstFactors.filter((factor) => factor !== "emailpassword");
                }
                if (tenantConfigRes.thirdParty.enabled === false) {
                    firstFactors = firstFactors.filter((factor) => factor !== "thirdparty");
                }
                if (tenantConfigRes.passwordless.enabled === false) {
                    firstFactors = firstFactors.filter(
                        (factor) => !["otp-email", "otp-phone", "link-email", "link-phone"].includes(factor)
                    );
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
                firstFactors,
            };
        },
    };
}
exports.default = getAPIInterface;
