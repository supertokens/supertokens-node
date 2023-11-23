import UserRoles from "../../../../userroles";
import UserRolesRecipe from "../../../../userroles/recipe";

import { APIFunction, APIInterface } from "../../../types";

type Response =
    | {
          status: "OK";
          roles: string[];
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      };

const getAllRoles: APIFunction = async (_: APIInterface, __: string, ____: any): Promise<Response> => {
    try {
        UserRolesRecipe.getInstanceOrThrowError();
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    const response = await UserRoles.getAllRoles();
    return {
        status: "OK",
        roles: response.roles,
    };
};

export default getAllRoles;
