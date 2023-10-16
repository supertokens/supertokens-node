import UserRoles from "../../../../userroles";
import { APIInterface, APIOptions } from "../../../types";

import STError from "../../../../../error";

const getPermissionsForRole = async (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    __: any
): Promise<{
    status: "OK";
    permissions: string[];
}> => {
    const role = options.req.getKeyValueFromQuery("role");

    if (role === undefined) {
        throw new STError({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await UserRoles.getPermissionsForRole(role);

    if (response.status === "UNKNOWN_ROLE_ERROR") {
        return {
            status: "OK",
            permissions: [],
        };
    }

    return response;
};

export default getPermissionsForRole;
