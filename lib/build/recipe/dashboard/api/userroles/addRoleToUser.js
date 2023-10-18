"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const userroles_1 = __importDefault(require("../../../userroles"));
const error_1 = __importDefault(require("../../../../error"));
const addRoleToUser = async (_, tenantId, options, __) => {
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
    if (response.status === "OK" && response.didUserAlreadyHaveRole === true) {
        return {
            status: "ROLE_ALREADY_ASSIGNED",
        };
    }
    if (response.status === "UNKNOWN_ROLE_ERROR") {
        return {
            status: "UNKNOWN_ROLE_ERROR",
        };
    }
    return {
        status: "OK",
    };
};
exports.default = addRoleToUser;
