// @ts-nocheck
import { APIFunction } from "../../types";
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
export default function createTenant({ options, userContext }: Parameters<APIFunction>[0]): Promise<Response>;
