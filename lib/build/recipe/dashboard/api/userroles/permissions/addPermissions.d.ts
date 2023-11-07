// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
declare const addPermissions: (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    __: any
) => Promise<
    | {
          status: "OK";
          createdNewRole: boolean;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
>;
export default addPermissions;
