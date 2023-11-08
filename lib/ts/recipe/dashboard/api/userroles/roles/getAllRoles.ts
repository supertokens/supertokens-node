import UserRoles from "../../../../userroles";
import STError from "../../../../../error";
import UserRolesRecipe from "../../../../userroles/recipe";

import { APIFunction, APIInterface, APIOptions } from "../../../types";

type Roles = { role: string; permissions: string[] }[];

type Response =
    | {
          status: "OK";
          totalPages: number;
          roles: Roles;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      };

const getAllRoles: APIFunction = async (
    _: APIInterface,
    __: string,
    options: APIOptions,
    ____: any
): Promise<Response> => {
    try {
        UserRolesRecipe.getInstanceOrThrowError();
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    const limit = Number(options.req.getKeyValueFromQuery("limit"));
    let page = Number(options.req.getKeyValueFromQuery("page"));

    if (limit === undefined || isNaN(limit) === false) {
        throw new STError({
            message: "Missing required parameter 'limit'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (page === undefined || isNaN(page) === false) {
        throw new STError({
            message: "Missing required parameter 'page'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    //set default page number to 1 if the page number is negitive or zero
    if (page <= 0) {
        page = 1;
    }

    const skip = limit * (page - 1);

    const response = await UserRoles.getAllRoles();

    const totalPages = Math.ceil(response.roles.length / limit);

    if (page > totalPages) {
        return {
            roles: [],
            totalPages,
            status: "OK",
        };
    }
    const paginatedRoles = response.roles.slice(skip, skip + limit);

    let roles: Roles = [];

    for (let i = 0; i < paginatedRoles.length; i++) {
        const role = paginatedRoles[i];
        try {
            const res = await UserRoles.getPermissionsForRole(role);

            if (res.status === "OK") {
                roles.push({
                    role,
                    permissions: res.permissions,
                });
            } else {
                roles.push({
                    role,
                    permissions: [],
                });
            }
        } catch (_) {}
    }

    return {
        roles,
        totalPages,
        status: "OK",
    };
};

export default getAllRoles;
