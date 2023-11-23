"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../../../userroles/recipe"));
const userroles_1 = __importDefault(require("../../../userroles"));
const error_1 = __importDefault(require("../../../../error"));
const addRoleToUser = async (_, tenantId, options, __) => {
    try {
        recipe_1.default.getInstanceOrThrowError();
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
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
    const response = await userroles_1.default.addRoleToUser(tenantId, userId, role);
    return response;
};
exports.default = addRoleToUser;
