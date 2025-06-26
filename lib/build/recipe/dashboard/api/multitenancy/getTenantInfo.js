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
exports.default = getTenantInfo;
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const supertokens_1 = __importDefault(require("../../../../supertokens"));
const utils_1 = require("./utils");
const configUtils_1 = require("../../../thirdparty/providers/configUtils");
const querier_1 = require("../../../../querier");
const constants_1 = require("../../../multitenancy/constants");
async function getTenantInfo(_, tenantId, options, userContext) {
    var _a, _b;
    let tenantRes = await multitenancy_1.default.getTenant(tenantId, userContext);
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    let { status } = tenantRes,
        tenantConfig = __rest(tenantRes, ["status"]);
    let firstFactors = (0, utils_1.getNormalisedFirstFactorsBasedOnTenantConfigFromCoreAndSDKInit)(tenantConfig);
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    const userCount = await supertokens_1.default
        .getInstanceOrThrowError()
        .getUserCount(undefined, tenantId, userContext);
    const providersFromCore =
        (_a = tenantRes === null || tenantRes === void 0 ? void 0 : tenantRes.thirdParty) === null || _a === void 0
            ? void 0
            : _a.providers;
    const mtRecipe = recipe_1.default.getInstance();
    const staticProviders =
        (_b = mtRecipe === null || mtRecipe === void 0 ? void 0 : mtRecipe.staticThirdPartyProviders) !== null &&
        _b !== void 0
            ? _b
            : [];
    const mergedProvidersFromCoreAndStatic = (0, configUtils_1.mergeProvidersFromCoreAndStatic)(
        providersFromCore,
        staticProviders,
        tenantId === constants_1.DEFAULT_TENANT_ID
    );
    let querier = querier_1.Querier.getNewInstanceOrThrowError(options.recipeId);
    let coreConfig = await querier.sendGetRequest(
        {
            path: "/<tenantId>/recipe/dashboard/tenant/core-config",
            params: {
                tenantId,
            },
        },
        {},
        userContext
    );
    const tenant = {
        tenantId,
        thirdParty: {
            providers: await Promise.all(
                mergedProvidersFromCoreAndStatic.map(async (provider) => {
                    try {
                        const providerInstance = await (0, configUtils_1.findAndCreateProviderInstance)(
                            mergedProvidersFromCoreAndStatic,
                            provider.config.thirdPartyId,
                            provider.config.clients[0].clientType,
                            userContext
                        );
                        return {
                            thirdPartyId: provider.config.thirdPartyId,
                            name:
                                providerInstance === null || providerInstance === void 0
                                    ? void 0
                                    : providerInstance.config.name,
                        };
                    } catch (_) {
                        return {
                            thirdPartyId: provider.config.thirdPartyId,
                            name: provider.config.thirdPartyId,
                        };
                    }
                })
            ),
        },
        firstFactors: firstFactors,
        requiredSecondaryFactors: tenantRes.requiredSecondaryFactors,
        coreConfig: coreConfig.config,
        userCount,
    };
    return {
        status: "OK",
        tenant,
    };
}
