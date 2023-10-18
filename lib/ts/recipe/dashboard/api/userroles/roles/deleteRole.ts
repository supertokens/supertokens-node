import UserRoles from "../../../../userroles";
import { APIInterface, APIOptions } from "../../../types";

import STError from "../../../../../error";

const deleteRole = async (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    __: any
): Promise<{
    status: "OK" | "ROLE_DO_NOT_EXISTS";
}> => {
    const role = options.req.getKeyValueFromQuery("role");

    if (role === undefined || typeof role !== "string") {
        throw new STError({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await UserRoles.deleteRole(role);

    if (response.status === "OK" && response.didRoleExist === false) {
        return {
            status: "ROLE_DO_NOT_EXISTS",
        };
    }
    return {
        status: "OK",
    };
};

export default deleteRole;
