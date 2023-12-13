import { APIInterface, APIOptions } from "../../types";
import UserRolesRecipe from "../../../userroles/recipe";
import UserRoles from "../../../userroles";

import STError from "../../../../error";

const removeUserRole = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
): Promise<
    | {
          status: "OK";
          didUserHaveRole: boolean;
      }
    | {
          status: "UNKNOWN_ROLE_ERROR" | "FEATURE_NOT_ENABLED_ERROR";
      }
> => {
    try {
        UserRolesRecipe.getInstanceOrThrowError();
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

    const response = await UserRoles.removeUserRole(tenantId, userId, role);
    return response;
};

export default removeUserRole;
