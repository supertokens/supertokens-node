import { APIFunction } from "../../../types";

import STError from "../../../../../error";

const removePermissionsFromRole = async ({
    stInstance,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<{
    status: "OK" | "UNKNOWN_ROLE_ERROR" | "FEATURE_NOT_ENABLED_ERROR";
}> => {
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
        throw new STError({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (permissions === undefined || Array.isArray(permissions) === false)
        if (role === undefined) {
            throw new STError({
                message: "Required parameter 'role' is missing or has an invalid type",
                type: STError.BAD_INPUT_ERROR,
            });
        }

    const response = await userrolesRecipe.recipeInterfaceImpl.removePermissionsFromRole({
        role,
        permissions,
        userContext,
    });
    return response;
};

export default removePermissionsFromRole;
