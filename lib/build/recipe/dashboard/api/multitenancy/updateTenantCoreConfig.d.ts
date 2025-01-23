// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { UserContext } from "../../../../types";
export type Response =
    | {
          status: "OK";
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      }
    | {
          status: "INVALID_CONFIG_ERROR";
          message: string;
      };
export default function updateTenantCoreConfig(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response>;
