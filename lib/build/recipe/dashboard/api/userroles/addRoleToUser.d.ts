// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare const addRoleToUser: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
) => Promise<
    | {
          status: "OK";
          didUserAlreadyHaveRole: boolean;
      }
    | {
          status: "UNKNOWN_ROLE_ERROR" | "FEATURE_NOT_ENABLED_ERROR";
      }
>;
export default addRoleToUser;
