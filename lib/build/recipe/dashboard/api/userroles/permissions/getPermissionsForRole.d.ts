// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
declare const getPermissionsForRole: (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    __: any
) => Promise<
    | {
          status: "OK";
          permissions: string[];
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR" | "UNKNOWN_ROLE_ERROR";
      }
>;
export default getPermissionsForRole;
