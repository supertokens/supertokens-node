import UserRoles from "../../../../userroles";
import STError from "../../../../../error";
import UserRolesRecipe from "../../../../userroles/recipe";

import { APIFunction, APIInterface, APIOptions } from "../../../types";

type Roles = { role: string; permissions: string[] }[];

type Response =
    | {
          status: "OK";
          totalPages: number;
          rolesCount: number;
          roles: Roles;
      }
    | {
          status: "OK";
          roles: string[];
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

    //results with pagination and permissions assoicated with a role.
    if (
        options.req.getKeyValueFromQuery("limit") !== undefined &&
        options.req.getKeyValueFromQuery("page") !== undefined
    ) {
        const limit = Number(options.req.getKeyValueFromQuery("limit"));
        let page = Number(options.req.getKeyValueFromQuery("page"));

        if (isNaN(limit) === true) {
            throw new STError({
                message: "Missing required parameter 'limit' or invalid type",
                type: STError.BAD_INPUT_ERROR,
            });
        }

        if (isNaN(page) === true) {
            throw new STError({
                message: "Missing required parameter 'page' or invalid type",
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
        const rolesCount = response.roles.length;

        if (page > totalPages && page !== 1) {
            throw new Error("Please provide a valid page number");
        }

        //reversing the roles to show latest created roles at first.
        const paginatedRoles = response.roles.reverse().slice(skip, skip + limit);

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
                    //this case should never happen.
                    throw new Error("Should never come here.");
                }
            } catch (_) {}
        }

        return {
            roles,
            totalPages,
            rolesCount,
            status: "OK",
        };
    } else {
        const response = await UserRoles.getAllRoles();
        //reversing the roles to show latest created roles at first.
        return {
            status: "OK",
            roles: response.roles.reverse(),
        };
    }
};

export default getAllRoles;
