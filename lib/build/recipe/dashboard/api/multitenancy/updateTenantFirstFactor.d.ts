// @ts-nocheck
import { APIFunction } from "../../types";
export type Response =
    | {
          status: "OK";
      }
    | {
          status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK_ERROR";
          message: string;
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };
export default function updateTenantFirstFactor({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
