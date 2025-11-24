"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getAPIInterface;
const utils_1 = require("../../multitenancy/utils");
const configUtils_1 = require("../../thirdparty/providers/configUtils");
const constants_1 = require("../constants");
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
            const mergedProviders = (0, configUtils_1.mergeProvidersFromCoreAndStatic)(
                providerConfigsFromCore,
                providerInputsFromStatic,
                tenantId === constants_1.DEFAULT_TENANT_ID
            );
            const finalProviderList = [];
            for (const providerInput of mergedProviders) {
                try {
                    const providerInstance = await (0, configUtils_1.findAndCreateProviderInstance)(
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
            let firstFactors;
            if (tenantConfigRes.firstFactors !== undefined) {
                firstFactors = tenantConfigRes.firstFactors; // highest priority, config from core
            } else if (options.staticFirstFactors !== undefined) {
                firstFactors = options.staticFirstFactors; // next priority, static config
            } else {
                // Fallback to all available factors (de-duplicated)
                firstFactors = Array.from(new Set(options.allAvailableFirstFactors));
            }
            // we now filter out all available first factors by checking if they are valid because
            // we want to return the ones that can work. this would be based on what recipes are enabled
            // on the core and also firstFactors configured in the core and supertokens.init
            // Also, this way, in the front end, the developer can just check for firstFactors for
            // enabled recipes in all cases irrespective of whether they are using MFA or not
            let validFirstFactors = [];
            for (const factorId of firstFactors) {
                let validRes = await (0, utils_1.isValidFirstFactor)(tenantId, factorId, userContext);
                if (validRes.status === "OK") {
                    validFirstFactors.push(factorId);
                }
                if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                    throw new Error("Tenant not found");
                }
            }
            return {
                status: "OK",
                emailPassword: {
                    enabled: validFirstFactors.includes("emailpassword"),
                },
                thirdParty: {
                    enabled: validFirstFactors.includes("thirdparty"),
                    providers: finalProviderList,
                },
                webauthn: {
                    enabled: validFirstFactors.includes("webauthn"),
                },
                passwordless: {
                    enabled:
                        validFirstFactors.includes("otp-email") ||
                        validFirstFactors.includes("otp-phone") ||
                        validFirstFactors.includes("link-email") ||
                        validFirstFactors.includes("link-phone"),
                },
                firstFactors: validFirstFactors,
            };
        },
    };
}
