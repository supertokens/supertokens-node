"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const supertokens_1 = __importDefault(require("../../../../supertokens"));
const configUtils_1 = require("../../../thirdparty/providers/configUtils");
async function getTenantInfo(_, tenantId, __, userContext) {
    var _a, _b, _c;
    let tenantRes;
    try {
        tenantRes = await multitenancy_1.default.getTenant(tenantId, userContext);
    } catch (_) {}
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    const userCount = await supertokens_1.default
        .getInstanceOrThrowError()
        .getUserCount(undefined, tenantId, userContext);
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
    const mergedProvidersFromCoreAndStatic = configUtils_1
        .mergeProvidersFromCoreAndStatic(providersFromCore, staticProviders)
        .map((provider) => provider.config);
    const tenant = {
        tenantId,
        emailPassword: tenantRes.emailPassword,
        passwordless: tenantRes.passwordless,
        thirdParty: Object.assign(Object.assign({}, tenantRes.thirdParty), { mergedProvidersFromCoreAndStatic }),
        coreConfig: tenantRes.coreConfig,
        firstFactors: tenantRes.firstFactors,
        requiredSecondaryFactors: tenantRes.requiredSecondaryFactors,
        userCount,
    };
    return {
        status: "OK",
        tenant,
    };
}
exports.default = getTenantInfo;
