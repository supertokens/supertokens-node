"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
async function getTenantInfo(_, __, options, userContext) {
    var _a, _b, _c;
    const tenantId = (_a = options.req.getKeyValueFromQuery("tenantId")) !== null && _a !== void 0 ? _a : "";
    let tenantRes;
    try {
        tenantRes = await multitenancy_1.default.getTenant(tenantId, userContext);
    } catch (_) {}
    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }
    const tenant = {
        id: tenantId,
        emailPassword: tenantRes.emailPassword,
        passwordless: tenantRes.passwordless,
        thirdParty: Object.assign(Object.assign({}, tenantRes.thirdParty), {
            providers:
                (_c =
                    (_b = tenantRes.thirdParty.providers) === null || _b === void 0
                        ? void 0
                        : _b.map((provider) => {
                              var _a;
                              return {
                                  id: provider.thirdPartyId,
                                  name: (_a = provider.name) !== null && _a !== void 0 ? _a : "",
                              };
                          })) !== null && _c !== void 0
                    ? _c
                    : [],
        }),
        coreConfig: tenantRes.coreConfig,
    };
    return {
        status: "OK",
        tenant,
    };
}
exports.default = getTenantInfo;
