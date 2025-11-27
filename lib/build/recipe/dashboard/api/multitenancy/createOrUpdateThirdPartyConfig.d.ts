// @ts-nocheck
import { APIFunction } from "../../types";
export type Response =
    | {
          status: "OK";
          createdNew: boolean;
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      }
    | {
          status: "BOXY_ERROR";
          message: string;
      };
export default function createOrUpdateThirdPartyConfig({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
