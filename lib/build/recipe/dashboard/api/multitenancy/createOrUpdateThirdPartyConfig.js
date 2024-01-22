"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const error_1 = __importDefault(require("../../../../error"));
async function createOrUpdateThirdPartyConfig(_, __, options, userContext) {
    const requestBody = await options.req.getJSONBody();
    const { tenantId, providerConfig } = requestBody;
    if (typeof tenantId !== "string" || tenantId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'tenantId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (
        typeof providerConfig !== "object" ||
        providerConfig === null ||
        typeof (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.thirdPartyId) !==
            "string"
    ) {
        throw new error_1.default({
            message: "Missing required parameter 'providerConfig' or 'providerConfig.thirdPartyId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    let thirdPartyRes;
    try {
        thirdPartyRes = await multitenancy_1.default.createOrUpdateThirdPartyConfig(
            tenantId,
            providerConfig,
            undefined,
            userContext
        );
    } catch (err) {
        return {
            status: "INVALID_PROVIDER_CONFIG",
            message: err.message,
        };
    }
    return thirdPartyRes;
}
exports.default = createOrUpdateThirdPartyConfig;
