// @ts-nocheck
import { APIFunction } from "../../types";
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
export default function updateTenantCoreConfig({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
