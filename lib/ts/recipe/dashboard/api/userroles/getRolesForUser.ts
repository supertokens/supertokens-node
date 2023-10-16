import { APIInterface, APIOptions } from "../../types";
import UserRoles from "../../../userroles";

import STError from "../../../../error";

const getRolesForUser = async (
    _: APIInterface,
    ___: string,
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
    const userId = options.req.getKeyValueFromQuery("userId");
    const tenantId = options.req.getKeyValueFromQuery("tenantId") ?? "public";

    if (userId === undefined || typeof userId !== "string") {
        throw new STError({
            message: "Required parameter 'userId' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await UserRoles.getRolesForUser(tenantId, userId);
    return response;
};

export default getRolesForUser;
