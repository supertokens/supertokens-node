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
const supertokens_1 = __importDefault(require("../../../../supertokens"));
const utils_1 = require("./utils");
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
    // const coreConfig = await SuperTokens.getInstanceOrThrowError().listAllCoreConfigProperties({
    //     tenantId,
    //     userContext,
    // });
    const tenant = {
        tenantId,
        thirdParty: {
            providers: mergedProvidersFromCoreAndStatic.map((provider) => provider.thirdPartyId),
        },
        firstFactors: firstFactors,
        requiredSecondaryFactors: tenantRes.requiredSecondaryFactors,
        // coreConfig: coreConfig.config,
        coreConfig: [
            {
                key: "password_reset_token_lifetime",
                valueType: "number",
                value: 3600000,
                description: "The time in milliseconds for which the password reset token is valid.",
                isSaaSProtected: false,
                isDifferentAcrossTenants: true,
                isModifyableOnlyViaConfigYaml: false,
                defaultValue: 3600000,
                isNullable: false,
                isPluginProperty: false,
            },
            {
                key: "access_token_blacklisting",
                valueType: "boolean",
                value: false,
                description: "Whether to blacklist access tokens or not.",
                isSaaSProtected: false,
                isDifferentAcrossTenants: true,
                isModifyableOnlyViaConfigYaml: false,
                defaultValue: false,
                isNullable: false,
                isPluginProperty: false,
            },
            {
                key: "ip_allow_regex",
                valueType: "string",
                value: null,
                description: "The regex to match the IP address of the user.",
                isSaaSProtected: false,
                isDifferentAcrossTenants: true,
                isModifyableOnlyViaConfigYaml: false,
                defaultValue: null,
                isNullable: true,
                isPluginProperty: false,
            },
            {
                key: "postgresql_emailpassword_users_table_name",
                valueType: "string",
                value: null,
                description: "The name of the table where the emailpassword users are stored.",
                isSaaSProtected: false,
                isDifferentAcrossTenants: true,
                isModifyableOnlyViaConfigYaml: false,
                defaultValue: 3600000,
                isNullable: true,
                isPluginProperty: true,
            },
        ],
        userCount,
    };
    return {
        status: "OK",
        tenant,
    };
}
exports.default = getTenantInfo;
