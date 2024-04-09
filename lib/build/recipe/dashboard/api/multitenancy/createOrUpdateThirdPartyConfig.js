"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
async function createOrUpdateThirdPartyConfig(_, tenantId, options, userContext) {
    const requestBody = await options.req.getJSONBody();
    const { providerConfig } = requestBody;
    const thirdPartyRes = await multitenancy_1.default.createOrUpdateThirdPartyConfig(
        tenantId,
        providerConfig,
        undefined,
        userContext
    );
    return thirdPartyRes;
}
exports.default = createOrUpdateThirdPartyConfig;
