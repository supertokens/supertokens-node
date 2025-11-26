// @ts-nocheck
import { APIFunction } from "../../types";
export type Response =
    | {
          status: "OK";
          didExist: boolean;
      }
    | {
          status: "CANNOT_DELETE_PUBLIC_TENANT_ERROR";
      };
export default function deleteTenant({
    stInstance,
    tenantId,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
