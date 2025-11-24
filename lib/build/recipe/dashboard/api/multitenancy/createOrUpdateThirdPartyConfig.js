"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createOrUpdateThirdPartyConfig;
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const normalisedURLDomain_1 = __importDefault(require("../../../../normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("../../../../normalisedURLPath"));
const thirdpartyUtils_1 = require("../../../../thirdpartyUtils");
const constants_1 = require("../../../multitenancy/constants");
const utils_1 = require("../../../../utils");
async function createOrUpdateThirdPartyConfig(_, tenantId, options, userContext) {
    var _a;
    const requestBody = await options.req.getJSONBody();
    const { providerConfig } = requestBody;
    let tenantRes = await multitenancy_1.default.getTenant(tenantId, userContext);
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    if (tenantRes.thirdParty.providers.length === 0) {
        // This means that the tenant was using the static list of providers, we need to add them all before adding the new one
        const mtRecipe = recipe_1.default.getInstance();
        const staticProviders =
            (_a = mtRecipe === null || mtRecipe === void 0 ? void 0 : mtRecipe.staticThirdPartyProviders) !== null &&
            _a !== void 0
                ? _a
                : [];
        for (const provider of staticProviders.filter(
            (provider) =>
                provider.includeInNonPublicTenantsByDefault === true || tenantId === constants_1.DEFAULT_TENANT_ID
        )) {
            await multitenancy_1.default.createOrUpdateThirdPartyConfig(
                tenantId,
                {
                    thirdPartyId: provider.config.thirdPartyId,
                },
                undefined,
                userContext
            );
            // delay after each provider to avoid rate limiting
            await new Promise((r) => setTimeout(r, 500)); // 500ms
        }
    }
    if (providerConfig.thirdPartyId.startsWith("boxy-saml")) {
        const boxyURL = providerConfig.clients[0].additionalConfig.boxyURL;
        const boxyAPIKey = providerConfig.clients[0].additionalConfig.boxyAPIKey;
        providerConfig.clients[0].additionalConfig.boxyAPIKey = undefined;
        if (
            boxyAPIKey &&
            (providerConfig.clients[0].additionalConfig.samlInputType === "xml" ||
                providerConfig.clients[0].additionalConfig.samlInputType === "url")
        ) {
            const requestBody = {
                name: "",
                label: "",
                description: "",
                tenant:
                    providerConfig.clients[0].additionalConfig.boxyTenant ||
                    `${tenantId}-${providerConfig.thirdPartyId}`,
                product: providerConfig.clients[0].additionalConfig.boxyProduct || "supertokens",
                defaultRedirectUrl: providerConfig.clients[0].additionalConfig.redirectURLs[0],
                forceAuthn: false,
                encodedRawMetadata: providerConfig.clients[0].additionalConfig.samlXML
                    ? (0, utils_1.encodeBase64)(providerConfig.clients[0].additionalConfig.samlXML)
                    : "",
                redirectUrl: JSON.stringify(providerConfig.clients[0].additionalConfig.redirectURLs),
                metadataUrl: providerConfig.clients[0].additionalConfig.samlURL || "",
            };
            const normalisedDomain = new normalisedURLDomain_1.default(boxyURL);
            const normalisedBasePath = new normalisedURLPath_1.default(boxyURL);
            const connectionsPath = new normalisedURLPath_1.default("/api/v1/saml/config");
            const resp = await (0, thirdpartyUtils_1.doPostRequest)(
                normalisedDomain.getAsStringDangerous() +
                    normalisedBasePath.appendPath(connectionsPath).getAsStringDangerous(),
                requestBody,
                {
                    Authorization: `Api-Key ${boxyAPIKey}`,
                }
            );
            if (resp.status !== 200) {
                if (resp.status === 401) {
                    return {
                        status: "BOXY_ERROR",
                        message: "Invalid API Key",
                    };
                }
                return {
                    status: "BOXY_ERROR",
                    message: resp.stringResponse,
                };
            }
            if (resp.jsonResponse === undefined) {
                throw new Error("should never happen");
            }
            providerConfig.clients[0].clientId = resp.jsonResponse.clientID;
            providerConfig.clients[0].clientSecret = resp.jsonResponse.clientSecret;
        }
    }
    const thirdPartyRes = await multitenancy_1.default.createOrUpdateThirdPartyConfig(
        tenantId,
        providerConfig,
        undefined,
        userContext
    );
    return thirdPartyRes;
}
