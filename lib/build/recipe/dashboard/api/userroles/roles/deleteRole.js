"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const userroles_1 = __importDefault(require("../../../../userroles"));
const error_1 = __importDefault(require("../../../../../error"));
const deleteRole = async (_, ___, options, __) => {
    const role = options.req.getKeyValueFromQuery("role");
    if (role === undefined || typeof role !== "string") {
        throw new error_1.default({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const response = await userroles_1.default.deleteRole(role);
    if (response.status === "OK" && response.didRoleExist === false) {
        return {
            status: "ROLE_DO_NOT_EXISTS",
        };
    }
    return {
        status: "OK",
    };
};
exports.default = deleteRole;
