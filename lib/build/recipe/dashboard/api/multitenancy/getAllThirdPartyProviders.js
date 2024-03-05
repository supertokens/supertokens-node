"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const error_1 = __importDefault(require("../../../../error"));
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const configUtils_1 = require("../../../thirdparty/providers/configUtils");
async function getAllThirdPartyProviders(_, __, options, userContext) {
    var _a, _b, _c;
    const tenantId = options.req.getKeyValueFromQuery("tenantId");
    if (typeof tenantId !== "string" || tenantId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'tenantId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const tenantRes = await multitenancy_1.default.getTenant(tenantId, userContext);
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
    const allProvidersConfig = configUtils_1
        .mergeProvidersFromCoreAndStatic(providersFromCore, staticProviders)
        .map((provider) => provider.config);
    return {
        status: "OK",
        providers: allProvidersConfig,
    };
}
exports.default = getAllThirdPartyProviders;
