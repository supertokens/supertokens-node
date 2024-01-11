"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const error_1 = __importDefault(require("../../../../error"));
async function getTenantInfo(_, __, options, userContext) {
    var _a, _b;
    const tenantId = options.req.getKeyValueFromQuery("tenantId");
    if (tenantId === undefined || tenantId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'tenantId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
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
                (_b =
                    (_a = tenantRes.thirdParty.providers) === null || _a === void 0
                        ? void 0
                        : _a.map((provider) => {
                              var _a;
                              return {
                                  id: provider.thirdPartyId,
                                  name: (_a = provider.name) !== null && _a !== void 0 ? _a : "",
                              };
                          })) !== null && _b !== void 0
                    ? _b
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
