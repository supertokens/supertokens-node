import { APIFunction } from "../../../types";

import STError from "../../../../../error";

const getPermissionsForRole = async ({
    stInstance,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<
    | {
          status: "OK";
          permissions: string[];
      }
    | { status: "FEATURE_NOT_ENABLED_ERROR" | "UNKNOWN_ROLE_ERROR" }
> => {
    let userrolesRecipe = undefined;
    try {
        userrolesRecipe = stInstance.getRecipeInstanceOrThrow("userroles");
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    const role = options.req.getKeyValueFromQuery("role");

    if (role === undefined || typeof role !== "string") {
        throw new STError({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await userrolesRecipe.recipeInterfaceImpl.getPermissionsForRole({ role, userContext });

    return response;
};

export default getPermissionsForRole;
