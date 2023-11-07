import UserRoles from "../../../../userroles";
import UserRolesRecipe from "../../../../userroles/recipe";

import { APIFunction, APIInterface, APIOptions } from "../../../types";

type Roles = { role: string; permissions: string[] }[];

type Response =
    | {
          status: "OK";
          roles: Roles;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      };

const getAllRoles: APIFunction = async (_: APIInterface, __: string, ___: APIOptions, ____: any): Promise<Response> => {
    try {
        UserRolesRecipe.getInstanceOrThrowError();
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    const response = await UserRoles.getAllRoles();

    let roles: Roles = [];

    for (let i = 0; i < response.roles.length; i++) {
        const role = response.roles[i];
        try {
            const res = await UserRoles.getPermissionsForRole(role);

            if (res.status === "OK") {
                roles.push({
                    role,
                    permissions: res.permissions,
                });
            }
        } catch (_) {}
    }

    return {
        roles,
        status: "OK",
    };
};

export default getAllRoles;
