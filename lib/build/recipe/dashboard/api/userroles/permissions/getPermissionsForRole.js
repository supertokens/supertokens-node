"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../../../../userroles/recipe"));
const userroles_1 = __importDefault(require("../../../../userroles"));
const error_1 = __importDefault(require("../../../../../error"));
const getPermissionsForRole = async (_, ___, options, __) => {
    try {
        recipe_1.default.getInstanceOrThrowError();
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    const role = options.req.getKeyValueFromQuery("role");
    if (role === undefined || typeof role !== "string") {
        throw new error_1.default({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const response = await userroles_1.default.getPermissionsForRole(role);
    return response;
};
exports.default = getPermissionsForRole;
