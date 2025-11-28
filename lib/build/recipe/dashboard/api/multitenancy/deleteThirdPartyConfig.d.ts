// @ts-nocheck
import { APIFunction } from "../../types";
export type Response =
    | {
          status: "OK";
          didConfigExist: boolean;
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };
export default function deleteThirdPartyConfig({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
