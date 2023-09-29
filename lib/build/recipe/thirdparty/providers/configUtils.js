"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeProvidersFromCoreAndStatic = exports.mergeConfig = exports.findAndCreateProviderInstance = exports.getProviderConfigForClient = void 0;
const _1 = require(".");
const custom_1 = __importDefault(require("./custom"));
const utils_1 = require("./utils");
function getProviderConfigForClient(providerConfig, clientConfig) {
    return Object.assign(Object.assign({}, providerConfig), clientConfig);
}
exports.getProviderConfigForClient = getProviderConfigForClient;
async function fetchAndSetConfig(provider, clientType, userContext) {
    let config = await provider.getConfigForClientType({ clientType, userContext });
    config = await utils_1.discoverOIDCEndpoints(config);
    provider.config = config;
}
function createProvider(input) {
    if (input.config.thirdPartyId.startsWith("active-directory")) {
        return _1.ActiveDirectory(input);
    } else if (input.config.thirdPartyId.startsWith("apple")) {
        return _1.Apple(input);
    } else if (input.config.thirdPartyId.startsWith("bitbucket")) {
        return _1.Bitbucket(input);
    } else if (input.config.thirdPartyId.startsWith("discord")) {
        return _1.Discord(input);
    } else if (input.config.thirdPartyId.startsWith("facebook")) {
        return _1.Facebook(input);
    } else if (input.config.thirdPartyId.startsWith("github")) {
        return _1.Github(input);
    } else if (input.config.thirdPartyId.startsWith("gitlab")) {
        return _1.Gitlab(input);
    } else if (input.config.thirdPartyId.startsWith("google-workspaces")) {
        return _1.GoogleWorkspaces(input);
    } else if (input.config.thirdPartyId.startsWith("google")) {
        return _1.Google(input);
    } else if (input.config.thirdPartyId.startsWith("okta")) {
        return _1.Okta(input);
    } else if (input.config.thirdPartyId.startsWith("linkedin")) {
        return _1.Linkedin(input);
    } else if (input.config.thirdPartyId.startsWith("twitter")) {
        return _1.Twitter(input);
    } else if (input.config.thirdPartyId.startsWith("boxy-saml")) {
        return _1.BoxySAML(input);
    }
    return custom_1.default(input);
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
exports.findAndCreateProviderInstance = findAndCreateProviderInstance;
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
exports.mergeConfig = mergeConfig;
function mergeProvidersFromCoreAndStatic(providerConfigsFromCore, providerInputsFromStatic) {
    const mergedProviders = [];
    if (providerConfigsFromCore.length === 0) {
        for (const config of providerInputsFromStatic) {
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
exports.mergeProvidersFromCoreAndStatic = mergeProvidersFromCoreAndStatic;
