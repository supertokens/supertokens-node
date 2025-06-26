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
exports.default = getThirdPartyConfig;
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const configUtils_1 = require("../../../thirdparty/providers/configUtils");
const normalisedURLDomain_1 = __importDefault(require("../../../../normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("../../../../normalisedURLPath"));
const thirdpartyUtils_1 = require("../../../../thirdpartyUtils");
async function getThirdPartyConfig(_, tenantId, options, userContext) {
    var _a, _b, _c, _d, _e;
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
    let providersFromCore =
        (_a = tenantRes === null || tenantRes === void 0 ? void 0 : tenantRes.thirdParty) === null || _a === void 0
            ? void 0
            : _a.providers;
    const mtRecipe = recipe_1.default.getInstance();
    let staticProviders = (mtRecipe === null || mtRecipe === void 0 ? void 0 : mtRecipe.staticThirdPartyProviders)
        ? mtRecipe.staticThirdPartyProviders.map((provider) => Object.assign({}, provider))
        : [];
    let additionalConfig = undefined;
    // filter out providers that is not matching thirdPartyId
    providersFromCore = providersFromCore.filter((provider) => provider.thirdPartyId === thirdPartyId);
    // if none left, add one to this list so that it takes priority while merging
    if (providersFromCore.length === 0) {
        providersFromCore.push({
            thirdPartyId,
        });
    }
    // At this point, providersFromCore.length === 1
    // query param may be passed if we are creating a new third party config, check and update accordingly
    if (
        thirdPartyId.startsWith("okta") ||
        thirdPartyId.startsWith("active-directory") ||
        thirdPartyId.startsWith("boxy-saml") ||
        thirdPartyId.startsWith("google-workspaces")
    ) {
        if (thirdPartyId.startsWith("okta")) {
            const oktaDomain = options.req.getKeyValueFromQuery("oktaDomain");
            if (oktaDomain !== undefined) {
                additionalConfig = { oktaDomain };
            }
        } else if (thirdPartyId.startsWith("active-directory")) {
            const directoryId = options.req.getKeyValueFromQuery("directoryId");
            if (directoryId !== undefined) {
                additionalConfig = { directoryId };
            }
        } else if (thirdPartyId.startsWith("boxy-saml")) {
            let boxyURL = options.req.getKeyValueFromQuery("boxyUrl");
            let boxyAPIKey = options.req.getKeyValueFromQuery("boxyAPIKey");
            if (boxyURL !== undefined) {
                additionalConfig = { boxyURL };
                if (boxyAPIKey !== undefined) {
                    additionalConfig = Object.assign(Object.assign({}, additionalConfig), { boxyAPIKey });
                }
            }
        } else if (thirdPartyId.startsWith("google-workspaces")) {
            const hd = options.req.getKeyValueFromQuery("hd");
            if (hd !== undefined) {
                additionalConfig = { hd };
            }
        }
        if (additionalConfig !== undefined) {
            providersFromCore[0].oidcDiscoveryEndpoint = undefined;
            providersFromCore[0].authorizationEndpoint = undefined;
            providersFromCore[0].tokenEndpoint = undefined;
            providersFromCore[0].userInfoEndpoint = undefined;
            providersFromCore[0].clients = (
                (_b = providersFromCore[0].clients) !== null && _b !== void 0 ? _b : []
            ).map((client) =>
                Object.assign(Object.assign({}, client), {
                    additionalConfig: Object.assign(Object.assign({}, client.additionalConfig), additionalConfig),
                })
            );
        }
    }
    // filter out other providers from static
    staticProviders = staticProviders.filter((provider) => provider.config.thirdPartyId === thirdPartyId);
    if (staticProviders.length === 0 && thirdPartyId === "apple") {
        staticProviders.push({
            config: {
                thirdPartyId: "apple",
                clients: [
                    {
                        clientId: "nonguessable-temporary-client-id",
                    },
                ],
            },
        });
        additionalConfig = {
            teamId: "",
            keyId: "",
            privateKey:
                "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
        };
    }
    if (staticProviders.length === 1) {
        // modify additional config if query param is passed
        if (additionalConfig !== undefined) {
            // we set these to undefined so that these can be computed using the query param that was provided
            staticProviders[0] = Object.assign(Object.assign({}, staticProviders[0]), {
                config: Object.assign(Object.assign({}, staticProviders[0].config), {
                    oidcDiscoveryEndpoint: undefined,
                    authorizationEndpoint: undefined,
                    tokenEndpoint: undefined,
                    userInfoEndpoint: undefined,
                    clients: ((_c = staticProviders[0].config.clients) !== null && _c !== void 0 ? _c : []).map(
                        (client) =>
                            Object.assign(Object.assign({}, client), {
                                additionalConfig: Object.assign(
                                    Object.assign({}, client.additionalConfig),
                                    additionalConfig
                                ),
                            })
                    ),
                }),
            });
        }
    }
    let mergedProvidersFromCoreAndStatic = (0, configUtils_1.mergeProvidersFromCoreAndStatic)(
        providersFromCore,
        staticProviders,
        true
    );
    if (mergedProvidersFromCoreAndStatic.length !== 1) {
        throw new Error("should never come here!");
    }
    for (const mergedProvider of mergedProvidersFromCoreAndStatic) {
        if (mergedProvider.config.thirdPartyId === thirdPartyId) {
            if (mergedProvider.config.clients === undefined || mergedProvider.config.clients.length === 0) {
                mergedProvider.config.clients = [
                    Object.assign(
                        { clientId: "nonguessable-temporary-client-id" },
                        additionalConfig !== undefined ? { additionalConfig } : {}
                    ),
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
            for (const client of (_d = provider.config.clients) !== null && _d !== void 0 ? _d : []) {
                try {
                    const providerInstance = await (0, configUtils_1.findAndCreateProviderInstance)(
                        mergedProvidersFromCoreAndStatic,
                        thirdPartyId,
                        client.clientType,
                        userContext
                    );
                    const _f = providerInstance.config,
                        { clientId, clientSecret, clientType, scope, additionalConfig, forcePKCE } = _f,
                        commonConfig = __rest(_f, [
                            "clientId",
                            "clientSecret",
                            "clientType",
                            "scope",
                            "additionalConfig",
                            "forcePKCE",
                        ]);
                    clients.push({
                        clientId,
                        clientSecret,
                        scope,
                        clientType,
                        additionalConfig,
                        forcePKCE,
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
    if (
        (additionalConfig === null || additionalConfig === void 0 ? void 0 : additionalConfig.privateKey) !== undefined
    ) {
        additionalConfig.privateKey = "";
    }
    const tempClients = clients.filter((client) => client.clientId === "nonguessable-temporary-client-id");
    const finalClients = clients.filter((client) => client.clientId !== "nonguessable-temporary-client-id");
    if (finalClients.length === 0) {
        finalClients.push(
            Object.assign(
                Object.assign(Object.assign({}, tempClients[0]), { clientId: "", clientSecret: "" }),
                additionalConfig !== undefined ? { additionalConfig } : {}
            )
        );
    }
    // fill in boxy info from boxy instance
    if (thirdPartyId.startsWith("boxy-saml")) {
        const boxyAPIKey = options.req.getKeyValueFromQuery("boxyAPIKey");
        if (boxyAPIKey) {
            if (finalClients[0].clientId !== "") {
                const boxyURL = (_e = finalClients[0].additionalConfig) === null || _e === void 0 ? void 0 : _e.boxyURL;
                const normalisedDomain = new normalisedURLDomain_1.default(boxyURL);
                const normalisedBasePath = new normalisedURLPath_1.default(boxyURL);
                const connectionsPath = new normalisedURLPath_1.default("/api/v1/saml/config");
                const resp = await (0, thirdpartyUtils_1.doGetRequest)(
                    normalisedDomain.getAsStringDangerous() +
                        normalisedBasePath.appendPath(connectionsPath).getAsStringDangerous(),
                    {
                        clientID: finalClients[0].clientId,
                    },
                    {
                        Authorization: `Api-Key ${boxyAPIKey}`,
                    }
                );
                if (resp.status === 200) {
                    // we don't care about non 200 status codes since we are just trying to populate whatever possible
                    if (resp.jsonResponse === undefined) {
                        throw new Error("should never happen");
                    }
                    finalClients[0].additionalConfig = Object.assign(
                        Object.assign({}, finalClients[0].additionalConfig),
                        {
                            redirectURLs: resp.jsonResponse.redirectUrl,
                            boxyTenant: resp.jsonResponse.tenant,
                            boxyProduct: resp.jsonResponse.product,
                        }
                    );
                }
            }
        }
    }
    return {
        status: "OK",
        providerConfig: Object.assign(Object.assign({}, commonProviderConfig), {
            clients: finalClients,
            isGetAuthorisationRedirectUrlOverridden,
            isExchangeAuthCodeForOAuthTokensOverridden,
            isGetUserInfoOverridden,
        }),
    };
}
