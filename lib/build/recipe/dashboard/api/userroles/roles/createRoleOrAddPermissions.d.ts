// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
declare const createRoleOrAddPermissions: (
    _: APIInterface,
    __: string,
    options: APIOptions,
    ___: any
) => Promise<
    | {
          status: "OK";
          createdNewRole: boolean;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
>;
export default createRoleOrAddPermissions;
