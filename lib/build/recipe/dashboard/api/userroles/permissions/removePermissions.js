"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = __importDefault(require("../../../../../error"));
const removePermissionsFromRole = async ({ stInstance, options, userContext }) => {
    let userrolesRecipe = undefined;
    try {
        userrolesRecipe = stInstance.getRecipeInstanceOrThrow("userroles");
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    const requestBody = await options.req.getJSONBody();
    const role = requestBody.role;
    const permissions = requestBody.permissions;
    if (role === undefined || typeof role !== "string") {
        throw new error_1.default({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    if (permissions === undefined || Array.isArray(permissions) === false)
        if (role === undefined) {
            throw new error_1.default({
                message: "Required parameter 'role' is missing or has an invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
    const response = await userrolesRecipe.recipeInterfaceImpl.removePermissionsFromRole({
        role,
        permissions,
        userContext,
    });
    return response;
};
exports.default = removePermissionsFromRole;
