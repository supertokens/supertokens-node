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
    var _a, _b, _c, _d;
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
    const providersFromCore =
        (_b =
            (_a = tenantRes === null || tenantRes === void 0 ? void 0 : tenantRes.thirdParty) === null || _a === void 0
                ? void 0
                : _a.providers) !== null && _b !== void 0
            ? _b
            : [];
    const mtRecipe = recipe_1.default.getInstance();
    const staticProviders =
        (_c = mtRecipe === null || mtRecipe === void 0 ? void 0 : mtRecipe.staticThirdPartyProviders) !== null &&
        _c !== void 0
            ? _c
            : [];
    let mergedProvidersFromCoreAndStatic = configUtils_1.mergeProvidersFromCoreAndStatic(
        providersFromCore,
        staticProviders
    );
    const clients = [];
    let commonProviderConfig = {
        thirdPartyId,
    };
    let isGetAuthorisationRedirectUrlOverridden = false;
    let isExchangeAuthCodeForOAuthTokensOverridden = false;
    let isGetUserInfoOverridden = false;
    mergedProvidersFromCoreAndStatic = [
        ...mergedProvidersFromCoreAndStatic,
        {
            config: Object.assign(
                Object.assign(
                    Object.assign(
                        Object.assign(
                            {
                                thirdPartyId,
                                clients: [
                                    Object.assign(
                                        Object.assign(
                                            { clientId: "nonguessable-temporary-client-id" },
                                            thirdPartyId === "apple"
                                                ? {
                                                      additionalConfig: {
                                                          teamId: "team-id",
                                                          keyId: "key-id",
                                                          privateKey:
                                                              "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                                                      },
                                                  }
                                                : undefined
                                        ),
                                        thirdPartyId === "google-workspaces"
                                            ? {
                                                  additionalConfig: {
                                                      hd: options.req.getKeyValueFromQuery("hd"),
                                                  },
                                              }
                                            : undefined
                                    ),
                                ],
                            },
                            thirdPartyId === "active-directory"
                                ? {
                                      oidcDiscoveryEndpoint: `https://login.microsoftonline.com/${options.req.getKeyValueFromQuery(
                                          "directoryId"
                                      )}/v2.0/`,
                                  }
                                : undefined
                        ),
                        thirdPartyId === "okta"
                            ? {
                                  oidcDiscoveryEndpoint: options.req.getKeyValueFromQuery("oktaDomain"),
                              }
                            : undefined
                    ),
                    thirdPartyId === "active-directory"
                        ? {
                              oidcDiscoveryEndpoint: `https://login.microsoftonline.com/${options.req.getKeyValueFromQuery(
                                  "directoryId"
                              )}/v2.0/`,
                          }
                        : undefined
                ),
                thirdPartyId === "boxy-saml"
                    ? {
                          authorizationEndpoint: `${options.req.getKeyValueFromQuery("boxyUrl")}/api/oauth/authorize`,
                          tokenEndpoint: `${options.req.getKeyValueFromQuery("boxyUrl")}/api/oauth/token`,
                          userInfoEndpoint: `${options.req.getKeyValueFromQuery("boxyUrl")}/api/oauth/userinfo`,
                      }
                    : undefined
            ),
        },
    ];
    for (const provider of mergedProvidersFromCoreAndStatic) {
        if (provider.config.thirdPartyId === thirdPartyId) {
            let foundCorrectConfig = false;
            for (const client of (_d = provider.config.clients) !== null && _d !== void 0 ? _d : []) {
                try {
                    const providerInstance = await configUtils_1.findAndCreateProviderInstance(
                        mergedProvidersFromCoreAndStatic,
                        thirdPartyId,
                        client.clientType,
                        userContext
                    );
                    const _e = providerInstance.config,
                        { clientId, clientSecret, clientType, scope, additionalConfig } = _e,
                        commonConfig = __rest(_e, [
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
