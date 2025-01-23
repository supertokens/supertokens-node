"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const userroles_1 = __importDefault(require("../../../../userroles"));
const recipe_1 = __importDefault(require("../../../../userroles/recipe"));
const getAllRoles = async (_, __, ____) => {
    try {
        recipe_1.default.getInstanceOrThrowError();
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    const response = await userroles_1.default.getAllRoles();
    return {
        status: "OK",
        roles: response.roles,
    };
};
exports.default = getAllRoles;
