"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const userroles_1 = __importDefault(require("../../../../userroles"));
const error_1 = __importDefault(require("../../../../../error"));
const createRole = async (_, __, options, ___) => {
    const requestBody = await options.req.getJSONBody();
    const permissions = requestBody.permissions;
    const role = requestBody.role;
    if (permissions === undefined) {
        throw new error_1.default({
            message: "Required parameter 'permissions' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (role === undefined) {
        throw new error_1.default({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const response = await userroles_1.default.createNewRoleOrAddPermissions(role, permissions);
    if (response.status === "OK" && response.createdNewRole === false) {
        return {
            status: "ROLE_ALREADY_EXITS",
        };
    }
    return {
        status: "OK",
    };
};
exports.default = createRole;
