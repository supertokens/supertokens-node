// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare const addRoleToUser: (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    __: any
) => Promise<
    | {
          status: "OK";
      }
    | {
          status: "UNKNOWN_ROLE_ERROR";
      }
    | {
          status: "ROLE_ALREADY_ASSIGNED";
      }
>;
export default addRoleToUser;
