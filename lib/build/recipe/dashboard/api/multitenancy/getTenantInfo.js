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
// import MultitenancyRecipe from "../../../multitenancy/recipe";
// import { ProviderConfig } from "../../../thirdparty/types";
const supertokens_1 = __importDefault(require("../../../../supertokens"));
const utils_1 = require("./utils");
async function getTenantInfo(_, tenantId, __, userContext) {
    let tenantRes;
    try {
        tenantRes = await multitenancy_1.default.getTenant(tenantId, userContext);
    } catch (_) {}
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    let { status } = tenantRes,
        tenantConfig = __rest(tenantRes, ["status"]);
    let firstFactors = utils_1.normaliseTenantLoginMethodsWithInitConfig(tenantConfig);
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    const userCount = await supertokens_1.default
        .getInstanceOrThrowError()
        .getUserCount(undefined, tenantId, userContext);
    // const providersFromCore = tenantRes?.thirdParty?.providers ?? [];
    // const mtRecipe = MultitenancyRecipe.getInstance();
    // const staticProviders = mtRecipe?.staticThirdPartyProviders ?? [];
    // const mergedProvidersFromCoreAndStatic = mergeProvidersFromCoreAndStatic(providersFromCore, staticProviders).map(
    //     (provider) => provider.config
    // );
    const tenant = {
        tenantId,
        thirdParty: {
            providers: [], // TODO
        },
        firstFactors: firstFactors,
        requiredSecondaryFactors: tenantRes.requiredSecondaryFactors,
        coreConfig: [],
        userCount,
    };
    return {
        status: "OK",
        tenant,
    };
}
exports.default = getTenantInfo;
