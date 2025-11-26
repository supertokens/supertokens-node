import { APIFunction } from "../../types";

import STError from "../../../../error";

const addRoleToUser = async ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<
    | {
          status: "OK";
          didUserAlreadyHaveRole: boolean;
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

    const requestBody = await options.req.getJSONBody();

    const userId = requestBody.userId;
    const role = requestBody.role;

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

    const response = await userrolesRecipe.recipeInterfaceImpl.addRoleToUser({ userId, role, tenantId, userContext });

    return response;
};

export default addRoleToUser;
