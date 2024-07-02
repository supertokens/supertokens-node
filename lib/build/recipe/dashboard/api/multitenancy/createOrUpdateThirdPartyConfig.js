"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
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
    if (tenantRes.thirdParty.providers === undefined) {
        // This means that the tenant was using the static list of providers, we need to add them all before adding the new one
        const mtRecipe = recipe_1.default.getInstance();
        const staticProviders =
            (_a = mtRecipe === null || mtRecipe === void 0 ? void 0 : mtRecipe.staticThirdPartyProviders) !== null &&
            _a !== void 0
                ? _a
                : [];
        for (const provider of staticProviders) {
            await multitenancy_1.default.createOrUpdateThirdPartyConfig(
                tenantId,
                {
                    thirdPartyId: provider.config.thirdPartyId,
                },
                undefined,
                userContext
            );
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
exports.default = createOrUpdateThirdPartyConfig;
