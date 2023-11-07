import UserRolesRecipe from "../../../../userroles/recipe";
import UserRoles from "../../../../userroles";
import { APIInterface, APIOptions } from "../../../types";

import STError from "../../../../../error";

const getPermissionsForRole = async (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    __: any
): Promise<
    | {
          status: "OK";
          permissions: string[];
      }
    | { status: "FEATURE_NOT_ENABLED_ERROR" | "UNKNOWN_ROLE_ERROR" }
> => {
    try {
        UserRolesRecipe.getInstanceOrThrowError();
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

    const response = await UserRoles.getPermissionsForRole(role);

    return response;
};

export default getPermissionsForRole;
