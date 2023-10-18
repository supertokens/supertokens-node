import { APIInterface, APIOptions } from "../../../types";
import UserRoles from "../../../../userroles";

import STError from "../../../../../error";

const createRole = async (
    _: APIInterface,
    __: string,
    options: APIOptions,
    ___: any
): Promise<{
    status: "OK" | "ROLE_ALREADY_EXITS";
}> => {
    const requestBody = await options.req.getJSONBody();
    const permissions = requestBody.permissions;
    const role = requestBody.role;

    if (role === undefined || typeof role !== "string") {
        throw new STError({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (permissions === undefined || Array.isArray(permissions) === false) {
        throw new STError({
            message: "Required parameter 'permissions' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    //TODO: check for a is this role already exists or not before creating the new role.

    const response = await UserRoles.createNewRoleOrAddPermissions(role, permissions);

    if (response.status === "OK" && response.createdNewRole === false) {
        return {
            status: "ROLE_ALREADY_EXITS",
        };
    }

    return {
        status: "OK",
    };
};

export default createRole;
