"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const error_1 = __importDefault(require("../../../../error"));
async function deleteThirdPartyConfig(_, __, options, userContext) {
    const tenantId = options.req.getKeyValueFromQuery("tenantId");
    const thirdPartyId = options.req.getKeyValueFromQuery("thirdPartyId");
    if (typeof tenantId !== "string" || tenantId === "" || typeof thirdPartyId !== "string" || thirdPartyId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'tenantId' or 'thirdPartyId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const deleteThirdPartyRes = await multitenancy_1.default.deleteThirdPartyConfig(
        tenantId,
        thirdPartyId,
        userContext
    );
    return deleteThirdPartyRes;
}
exports.default = deleteThirdPartyConfig;
