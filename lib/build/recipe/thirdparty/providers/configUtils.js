"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProviderConfigForClient = getProviderConfigForClient;
exports.findAndCreateProviderInstance = findAndCreateProviderInstance;
exports.mergeConfig = mergeConfig;
exports.mergeProvidersFromCoreAndStatic = mergeProvidersFromCoreAndStatic;
const _1 = require(".");
const custom_1 = __importDefault(require("./custom"));
const utils_1 = require("./utils");
function getProviderConfigForClient(providerConfig, clientConfig) {
    return Object.assign(Object.assign({}, providerConfig), clientConfig);
}
async function fetchAndSetConfig(provider, clientType, userContext) {
    let config = await provider.getConfigForClientType({ clientType, userContext });
    await (0, utils_1.discoverOIDCEndpoints)(config);
    // We are doing Object.assign here to retain the reference to the provider.config which originally came from
    // the impl object in the `custom.ts`. We are doing this because if we replace the provider.config with the
    // new config object, then when the user overrides a provider function, and access the `originalImplementaion.config`,
    // it will not receive the updated config, since the user's override would have returned a new provider object and
    // the config is being set on to it. By doing Object.assign, we retain the original reference and the config is
    // consistently available in the override as well as the implementation.
    Object.assign(provider.config, config);
}
function createProvider(input) {
    // We are cloning the input object because the built-in providers modify the `override` in the input
    // object, and we don't want to modify the original input object. If we do not clone the input object,
    // we add a new function for override and then call the override from the input object, and this way,
    // the override call stack keeps increasing over time. After a certain number of calls, the call stack
    // will overflow and the thirdparty provider will start failing.
    // We are only doing a shallow clone because the `override` is in the top level of the input object,
    // and other properties are just used for reading. The input object is also not exposed by any of the
    // interface for modification.
    const clonedInput = Object.assign({}, input);
    if (clonedInput.config.thirdPartyId.startsWith("active-directory")) {
        return (0, _1.ActiveDirectory)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("apple")) {
        return (0, _1.Apple)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("bitbucket")) {
        return (0, _1.Bitbucket)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("discord")) {
        return (0, _1.Discord)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("facebook")) {
        return (0, _1.Facebook)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("github")) {
        return (0, _1.Github)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("gitlab")) {
        return (0, _1.Gitlab)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("google-workspaces")) {
        return (0, _1.GoogleWorkspaces)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("google")) {
        return (0, _1.Google)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("okta")) {
        return (0, _1.Okta)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("linkedin")) {
        return (0, _1.Linkedin)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("twitter")) {
        return (0, _1.Twitter)(clonedInput);
    } else if (clonedInput.config.thirdPartyId.startsWith("boxy-saml")) {
        return (0, _1.BoxySAML)(clonedInput);
    }
    return (0, custom_1.default)(clonedInput);
}
async function findAndCreateProviderInstance(providers, thirdPartyId, clientType, userContext) {
    for (const providerInput of providers) {
        if (providerInput.config.thirdPartyId === thirdPartyId) {
            let providerInstance = createProvider(providerInput);
            await fetchAndSetConfig(providerInstance, clientType, userContext);
            return providerInstance;
        }
    }
    return undefined;
}
function mergeConfig(staticConfig, coreConfig) {
    var _a, _b, _c, _d;
    const result = Object.assign(Object.assign(Object.assign({}, staticConfig), coreConfig), {
        userInfoMap: {
            fromIdTokenPayload: Object.assign(
                Object.assign(
                    {},
                    (_a = staticConfig.userInfoMap) === null || _a === void 0 ? void 0 : _a.fromIdTokenPayload
                ),
                (_b = coreConfig.userInfoMap) === null || _b === void 0 ? void 0 : _b.fromIdTokenPayload
            ),
            fromUserInfoAPI: Object.assign(
                Object.assign(
                    {},
                    (_c = staticConfig.userInfoMap) === null || _c === void 0 ? void 0 : _c.fromUserInfoAPI
                ),
                (_d = coreConfig.userInfoMap) === null || _d === void 0 ? void 0 : _d.fromUserInfoAPI
            ),
        },
    });
    const mergedClients = staticConfig.clients === undefined ? [] : [...staticConfig.clients];
    const coreConfigClients = coreConfig.clients === undefined ? [] : coreConfig.clients;
    for (const client of coreConfigClients) {
        const index = mergedClients.findIndex((c) => c.clientType === client.clientType);
        if (index === -1) {
            mergedClients.push(client);
        } else {
            mergedClients[index] = Object.assign({}, client);
        }
    }
    result.clients = mergedClients;
    return result;
}
function mergeProvidersFromCoreAndStatic(providerConfigsFromCore, providerInputsFromStatic, includeAllProviders) {
    const mergedProviders = [];
    if (providerConfigsFromCore.length === 0) {
        for (const config of providerInputsFromStatic.filter(
            (config) => config.includeInNonPublicTenantsByDefault === true || includeAllProviders === true
        )) {
            mergedProviders.push(config);
        }
    } else {
        for (const providerConfigFromCore of providerConfigsFromCore) {
            let mergedProviderInput = {
                config: providerConfigFromCore,
            };
            for (const providerInputFromStatic of providerInputsFromStatic) {
                if (providerInputFromStatic.config.thirdPartyId == providerConfigFromCore.thirdPartyId) {
                    mergedProviderInput.config = mergeConfig(providerInputFromStatic.config, providerConfigFromCore);
                    mergedProviderInput.override = providerInputFromStatic.override;
                    break;
                }
            }
            mergedProviders.push(mergedProviderInput);
        }
    }
    return mergedProviders;
}
