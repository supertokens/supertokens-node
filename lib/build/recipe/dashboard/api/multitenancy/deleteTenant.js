"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const error_1 = __importDefault(require("../../../../error"));
async function deleteTenant(_, __, options, userContext) {
    const tenantId = options.req.getKeyValueFromQuery("tenantId");
    if (typeof tenantId !== "string" || tenantId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'tenantId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    await multitenancy_1.default.deleteTenant(tenantId, userContext);
    return {
        status: "OK",
    };
}
exports.default = deleteTenant;
