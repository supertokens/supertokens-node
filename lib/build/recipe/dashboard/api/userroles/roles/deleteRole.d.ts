// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
declare const deleteRole: (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    __: any
) => Promise<
    | {
          status: "OK";
          didRoleExist: boolean;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
>;
export default deleteRole;
