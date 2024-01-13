// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare const getRolesForUser: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
) => Promise<
    | {
          status: "OK";
          roles: string[];
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
>;
export default getRolesForUser;
