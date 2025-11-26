import { APIFunction } from "../../types";

import STError from "../../../../error";

const removeUserRole = async ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<
    | {
          status: "OK";
          didUserHaveRole: boolean;
      }
    | {
          status: "UNKNOWN_ROLE_ERROR" | "FEATURE_NOT_ENABLED_ERROR";
      }
> => {
    let userrolesRecipe = undefined;
    try {
        userrolesRecipe = stInstance.getRecipeInstanceOrThrow("userroles");
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    const userId = options.req.getKeyValueFromQuery("userId");
    const role = options.req.getKeyValueFromQuery("role");

    if (role === undefined || typeof role !== "string") {
        throw new STError({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (userId === undefined || typeof userId !== "string") {
        throw new STError({
            message: "Required parameter 'userId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await userrolesRecipe.recipeInterfaceImpl.removeUserRole({ userId, role, tenantId, userContext });
    return response;
};

export default removeUserRole;
