"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getAllRoles = async ({ stInstance, userContext }) => {
    let userrolesRecipe = undefined;
    try {
        userrolesRecipe = stInstance.getRecipeInstanceOrThrow("userroles");
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    const response = await userrolesRecipe.recipeInterfaceImpl.getAllRoles({ userContext });
    return {
        status: "OK",
        roles: response.roles,
    };
};
exports.default = getAllRoles;
