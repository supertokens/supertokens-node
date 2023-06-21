"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const configUtils_1 = require("../../thirdparty/providers/configUtils");
function getAPIInterface() {
    return {
        loginMethodsGET: function ({ tenantId, clientType, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const tenantConfigRes = yield options.recipeImplementation.getTenantConfig({
                    tenantId,
                    userContext,
                });
                const providerInputsFromStatic = options.staticThirdPartyProviders;
                const providerConfigsFromCore = tenantConfigRes.thirdParty.providers;
                const mergedProviders = configUtils_1.mergeProvidersFromCoreAndStatic(
                    providerConfigsFromCore,
                    providerInputsFromStatic
                );
                const finalProviderList = [];
                for (const providerInput of mergedProviders) {
                    try {
                        const providerInstance = yield configUtils_1.findAndCreateProviderInstance(
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
            });
        },
    };
}
exports.default = getAPIInterface;
