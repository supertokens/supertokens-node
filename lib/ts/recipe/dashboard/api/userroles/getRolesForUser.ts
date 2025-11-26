import { APIFunction } from "../../types";

import STError from "../../../../error";

const getRolesForUser = async ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<
    | {
          status: "OK";
          roles: string[];
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
> => {
    const userId = options.req.getKeyValueFromQuery("userId");

    let userrolesRecipe = undefined;
    try {
        userrolesRecipe = stInstance.getRecipeInstanceOrThrow("userroles");
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    if (userId === undefined || typeof userId !== "string") {
        throw new STError({
            message: "Required parameter 'userId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await userrolesRecipe.recipeInterfaceImpl.getRolesForUser({ userId, tenantId, userContext });
    return response;
};

export default getRolesForUser;
