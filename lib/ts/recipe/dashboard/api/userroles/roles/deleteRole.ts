import { deleteRole as roleDelete } from "../../../../userroles";

import { APIInterface, APIOptions } from "../../../types";

import STError from "../../../../../error";

const deleteRole = async (_: APIInterface, ___: string, options: APIOptions, __: any) => {
    const role = options.req.getKeyValueFromQuery("userId");

    if (role === undefined) {
        throw new STError({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await roleDelete(role);
    return response;
};

export default deleteRole;
