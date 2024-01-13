// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare const removeUserRole: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
) => Promise<
    | {
          status: "OK";
          didUserHaveRole: boolean;
      }
    | {
          status: "UNKNOWN_ROLE_ERROR" | "FEATURE_NOT_ENABLED_ERROR";
      }
>;
export default removeUserRole;
