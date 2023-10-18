"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const userroles_1 = __importDefault(require("../../../userroles"));
const error_1 = __importDefault(require("../../../../error"));
const removeUserRole = async (_, tenantId, options, __) => {
    const requestBody = await options.req.getJSONBody();
    const userId = requestBody.userId;
    const role = requestBody.role;
    if (role === undefined || typeof role !== "string") {
        throw new error_1.default({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (userId === undefined || typeof userId !== "string") {
        throw new error_1.default({
            message: "Required parameter 'userId' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const response = await userroles_1.default.removeUserRole(tenantId, userId, role);
    return response;
};
exports.default = removeUserRole;
