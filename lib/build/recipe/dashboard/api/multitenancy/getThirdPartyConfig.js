"use strict";
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const configUtils_1 = require("../../../thirdparty/providers/configUtils");
async function getThirdPartyConfig(_, tenantId, options, userContext) {
    var _a, _b, _c;
    let tenantRes = await multitenancy_1.default.getTenant(tenantId, userContext);
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    const thirdPartyId = options.req.getKeyValueFromQuery("thirdPartyId");
    if (thirdPartyId === undefined) {
        throw new Error("Please provide thirdPartyId");
    }
    // This API is called when creating a new thirdparty config
    // 1. we fetch providers from core
    // 2. if we find a matching provider, we update it with the additional input. for example, oktaDomain for okta
    //    if we don't find a matching provider, we add to this list
    //    we modify provider list from core because, it's always prioritised over static list
    //    also, we set authUrl, tokenUrl, etc to undefined while setting oidcDiscoveryEndpoint to ensure that they are populated from the discovery endpoint
    // 3. we mergee the modified provider list from core with the static provider
    // 4. we find and create instance for the given thirdPartyId to fetch the computed config (based on OIDC discovery)
    // 5. we return the final provider config
    let providersFromCore =
        (_a = tenantRes === null || tenantRes === void 0 ? void 0 : tenantRes.thirdParty) === null || _a === void 0
            ? void 0
            : _a.providers;
    const mtRecipe = recipe_1.default.getInstance();
    const staticProviders =
        (_b = mtRecipe === null || mtRecipe === void 0 ? void 0 : mtRecipe.staticThirdPartyProviders) !== null &&
        _b !== void 0
            ? _b
            : [];
    let found = false;
    for (let i = 0; i < providersFromCore.length; i++) {
        if (providersFromCore[i].thirdPartyId === thirdPartyId) {
            found = true;
            if (thirdPartyId === "okta") {
                providersFromCore[i].oidcDiscoveryEndpoint = options.req.getKeyValueFromQuery("oktaDomain");
                providersFromCore[i].authorizationEndpoint = undefined;
                providersFromCore[i].tokenEndpoint = undefined;
                providersFromCore[i].userInfoEndpoint = undefined;
            } else if (thirdPartyId === "active-directory") {
                providersFromCore[
                    i
                ].oidcDiscoveryEndpoint = `https://login.microsoftonline.com/${options.req.getKeyValueFromQuery(
                    "directoryId"
                )}/v2.0/`;
                providersFromCore[i].authorizationEndpoint = undefined;
                providersFromCore[i].tokenEndpoint = undefined;
                providersFromCore[i].userInfoEndpoint = undefined;
            } else if (thirdPartyId === "boxy-saml") {
                providersFromCore[i].oidcDiscoveryEndpoint = undefined;
                providersFromCore[i].authorizationEndpoint = `${options.req.getKeyValueFromQuery(
                    "boxyUrl"
                )}/api/oauth/authorize`;
                providersFromCore[i].tokenEndpoint = `${options.req.getKeyValueFromQuery("boxyUrl")}/api/oauth/token`;
                providersFromCore[i].userInfoEndpoint = `${options.req.getKeyValueFromQuery(
                    "boxyUrl"
                )}/api/oauth/userinfo`;
            } else if (thirdPartyId === "google-workspaces") {
                if (providersFromCore[i].clients !== undefined) {
                    for (let j = 0; j < providersFromCore[i].clients.length; j++) {
                        providersFromCore[i].clients[j].additionalConfig = {
                            hd: options.req.getKeyValueFromQuery("hd"),
                        };
                    }
                }
            }
        }
    }
    if (!found) {
        if (thirdPartyId === "okta") {
            providersFromCore.push({
                thirdPartyId,
                oidcDiscoveryEndpoint: options.req.getKeyValueFromQuery("oktaDomain"),
            });
        } else if (thirdPartyId === "active-directory") {
            providersFromCore.push({
                thirdPartyId,
                oidcDiscoveryEndpoint: `https://login.microsoftonline.com/${options.req.getKeyValueFromQuery(
                    "directoryId"
                )}/v2.0/`,
            });
        } else if (thirdPartyId === "boxy-saml") {
            providersFromCore.push({
                thirdPartyId,
                authorizationEndpoint: `${options.req.getKeyValueFromQuery("boxyUrl")}/api/oauth/authorize`,
                tokenEndpoint: `${options.req.getKeyValueFromQuery("boxyUrl")}/api/oauth/token`,
                userInfoEndpoint: `${options.req.getKeyValueFromQuery("boxyUrl")}/api/oauth/userinfo`,
            });
        } else if (thirdPartyId === "apple") {
            providersFromCore.push({
                thirdPartyId,
                clients: [
                    {
                        clientId: "nonguessable-temporary-client-id",
                        additionalConfig: {
                            teamId: "team-id",
                            keyId: "key-id",
                            privateKey:
                                "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                        },
                    },
                ],
            });
        } else if (thirdPartyId === "google-workspaces") {
            providersFromCore.push({
                thirdPartyId,
                clients: [
                    {
                        clientId: "nonguessable-temporary-client-id",
                        additionalConfig: {
                            hd: options.req.getKeyValueFromQuery("hd"),
                        },
                    },
                ],
            });
        } else {
            providersFromCore.push({
                thirdPartyId,
            });
        }
    }
    let mergedProvidersFromCoreAndStatic = configUtils_1.mergeProvidersFromCoreAndStatic(
        providersFromCore,
        staticProviders
    );
    for (const mergedProvider of mergedProvidersFromCoreAndStatic) {
        if (mergedProvider.config.thirdPartyId === thirdPartyId) {
            if (mergedProvider.config.clients === undefined || mergedProvider.config.clients.length === 0) {
                mergedProvider.config.clients = [
                    {
                        clientId: "nonguessable-temporary-client-id",
                    },
                ];
            }
        }
    }
    const clients = [];
    let commonProviderConfig = {
        thirdPartyId,
    };
    let isGetAuthorisationRedirectUrlOverridden = false;
    let isExchangeAuthCodeForOAuthTokensOverridden = false;
    let isGetUserInfoOverridden = false;
    for (const provider of mergedProvidersFromCoreAndStatic) {
        if (provider.config.thirdPartyId === thirdPartyId) {
            let foundCorrectConfig = false;
            for (const client of (_c = provider.config.clients) !== null && _c !== void 0 ? _c : []) {
                try {
                    const providerInstance = await configUtils_1.findAndCreateProviderInstance(
                        mergedProvidersFromCoreAndStatic,
                        thirdPartyId,
                        client.clientType,
                        userContext
                    );
                    const _d = providerInstance.config,
                        { clientId, clientSecret, clientType, scope, additionalConfig } = _d,
                        commonConfig = __rest(_d, [
                            "clientId",
                            "clientSecret",
                            "clientType",
                            "scope",
                            "additionalConfig",
                        ]);
                    clients.push({
                        clientId,
                        clientSecret,
                        scope,
                        clientType,
                        additionalConfig,
                    });
                    commonProviderConfig = commonConfig;
                    if (provider.override !== undefined) {
                        const beforeOverride = Object.assign({}, providerInstance);
                        const afterOverride = provider.override(beforeOverride);
                        if (beforeOverride.getAuthorisationRedirectURL !== afterOverride.getAuthorisationRedirectURL) {
                            isGetAuthorisationRedirectUrlOverridden = true;
                        }
                        if (
                            beforeOverride.exchangeAuthCodeForOAuthTokens !==
                            afterOverride.exchangeAuthCodeForOAuthTokens
                        ) {
                            isExchangeAuthCodeForOAuthTokensOverridden = true;
                        }
                        if (beforeOverride.getUserInfo !== afterOverride.getUserInfo) {
                            isGetUserInfoOverridden = true;
                        }
                    }
                    foundCorrectConfig = true;
                } catch (err) {
                    // ignore the error
                    clients.push(client);
                }
            }
            if (!foundCorrectConfig) {
                commonProviderConfig = provider.config;
            }
            break;
        }
    }
    return {
        status: "OK",
        providerConfig: Object.assign(Object.assign({}, commonProviderConfig), {
            clients: clients.filter((client) => client.clientId !== "nonguessable-temporary-client-id"),
            isGetAuthorisationRedirectUrlOverridden,
            isExchangeAuthCodeForOAuthTokensOverridden,
            isGetUserInfoOverridden,
        }),
    };
}
exports.default = getThirdPartyConfig;
