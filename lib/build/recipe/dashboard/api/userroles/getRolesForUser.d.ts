// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare const getRolesForUser: (
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
>;
export default getRolesForUser;
