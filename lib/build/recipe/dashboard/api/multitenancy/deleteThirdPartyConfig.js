"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const error_1 = __importDefault(require("../../../../error"));
const multifactorauth_1 = require("../../../multifactorauth");
async function deleteThirdPartyConfig(_, tenantId, options, userContext) {
    var _a, _b;
    const thirdPartyId = options.req.getKeyValueFromQuery("thirdPartyId");
    if (typeof tenantId !== "string" || tenantId === "" || typeof thirdPartyId !== "string" || thirdPartyId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'tenantId' or 'thirdPartyId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const tenantRes = await multitenancy_1.default.getTenant(tenantId, userContext);
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    const thirdPartyIdsFromCore = tenantRes.thirdParty.providers.map((provider) => provider.thirdPartyId);
    if (thirdPartyIdsFromCore.length > 1) {
        return await multitenancy_1.default.deleteThirdPartyConfig(tenantId, thirdPartyId, userContext);
    } else if (thirdPartyIdsFromCore.length === 0) {
        const mtRecipe = recipe_1.default.getInstance();
        const staticProviders =
            (_a = mtRecipe === null || mtRecipe === void 0 ? void 0 : mtRecipe.staticThirdPartyProviders) !== null &&
            _a !== void 0
                ? _a
                : [];
        let staticProviderIds = staticProviders.map((provider) => provider.config.thirdPartyId);
        staticProviderIds = staticProviderIds.filter((id) => id !== thirdPartyId);
        for (const providerId of staticProviderIds) {
            await multitenancy_1.default.createOrUpdateThirdPartyConfig(
                tenantId,
                {
                    thirdPartyId: providerId,
                },
                undefined,
                userContext
            );
        }
        return {
            status: "OK",
            didConfigExist: true,
        };
    } else {
        let firstFactors = (_b = tenantRes.firstFactors) !== null && _b !== void 0 ? _b : [];
        firstFactors = firstFactors.filter((factor) => factor !== multifactorauth_1.FactorIds.THIRDPARTY);
        await multitenancy_1.default.createOrUpdateTenant(
            tenantId,
            {
                thirdPartyEnabled: false,
                firstFactors: firstFactors,
            },
            userContext
        );
        return {
            status: "OK",
            didConfigExist: true,
        };
    }
}
exports.default = deleteThirdPartyConfig;
