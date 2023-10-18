import { APIInterface, APIOptions } from "../../types";
import UserRoles from "../../../userroles";

import STError from "../../../../error";

const removeUserRole = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
): Promise<
    | {
          status: "OK";
      }
    | {
          status: "UNKNOWN_ROLE_ERROR";
      }
> => {
    const requestBody = await options.req.getJSONBody();

    const userId = requestBody.userId;
    const role = requestBody.role;

    if (role === undefined || typeof role !== "string") {
        throw new STError({
            message: "Required parameter 'role' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (userId === undefined || typeof userId !== "string") {
        throw new STError({
            message: "Required parameter 'userId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await UserRoles.removeUserRole(tenantId, userId, role);
    return response;
};

export default removeUserRole;
