"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deleteThirdPartyConfig;
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const recipe_1 = __importDefault(require("../../../multitenancy/recipe"));
const error_1 = __importDefault(require("../../../../error"));
const multifactorauth_1 = require("../../../multifactorauth");
const constants_1 = require("../../../multitenancy/constants");
async function deleteThirdPartyConfig(_, tenantId, options, userContext) {
    var _a;
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
    if (thirdPartyIdsFromCore.length === 0) {
        // this means that the tenant was using the static list of providers, we need to add them all before deleting one
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
            const providerId = provider.config.thirdPartyId;
            await multitenancy_1.default.createOrUpdateThirdPartyConfig(
                tenantId,
                {
                    thirdPartyId: providerId,
                },
                undefined,
                userContext
            );
            // delay after each provider to avoid rate limiting
            await new Promise((r) => setTimeout(r, 500)); // 500ms
        }
    } else if (thirdPartyIdsFromCore.length === 1 && thirdPartyIdsFromCore[0] === thirdPartyId) {
        if (tenantRes.firstFactors === undefined) {
            // add all static first factors except thirdparty
            await multitenancy_1.default.createOrUpdateTenant(tenantId, {
                firstFactors: [
                    multifactorauth_1.FactorIds.EMAILPASSWORD,
                    multifactorauth_1.FactorIds.OTP_PHONE,
                    multifactorauth_1.FactorIds.OTP_EMAIL,
                    multifactorauth_1.FactorIds.LINK_PHONE,
                    multifactorauth_1.FactorIds.LINK_EMAIL,
                ],
            });
        } else if (tenantRes.firstFactors.includes("thirdparty")) {
            // add all static first factors except thirdparty
            const newFirstFactors = tenantRes.firstFactors.filter((factor) => factor !== "thirdparty");
            await multitenancy_1.default.createOrUpdateTenant(tenantId, {
                firstFactors: newFirstFactors,
            });
        }
    }
    return await multitenancy_1.default.deleteThirdPartyConfig(tenantId, thirdPartyId, userContext);
}
