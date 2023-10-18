import UserRoles from "../../../../userroles";
import { APIInterface, APIOptions } from "../../../types";

import STError from "../../../../../error";

const addPermissions = async (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    __: any
): Promise<{
    status: "OK";
    createdNewRole: boolean;
}> => {
    const requestBody = await options.req.getJSONBody();
    const role = requestBody.role;
    const permissions = requestBody.permissions;

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

    const response = await UserRoles.createNewRoleOrAddPermissions(role, permissions);

    return response;
};

export default addPermissions;
