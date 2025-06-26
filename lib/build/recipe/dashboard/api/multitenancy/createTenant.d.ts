// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { UserContext } from "../../../../types";
export type Response =
    | {
          status: "OK";
          createdNew: boolean;
      }
    | {
          status: "MULTITENANCY_NOT_ENABLED_IN_CORE_ERROR" | "TENANT_ID_ALREADY_EXISTS_ERROR";
      }
    | {
          status: "INVALID_TENANT_ID_ERROR";
          message: string;
      };
export default function createTenant(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response>;
