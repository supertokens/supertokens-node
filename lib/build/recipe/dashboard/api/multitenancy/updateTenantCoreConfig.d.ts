// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
export declare type Response =
    | {
          status: "OK";
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      }
    | {
          status: "INVALID_CONFIG";
          message: string;
      };
export default function updateTenantCoreConfig(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
