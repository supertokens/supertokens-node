// @ts-nocheck
import { APIFunction } from "../../types";
export type Response =
    | {
          status: "OK";
          isMFARequirementsForAuthOverridden: boolean;
      }
    | {
          status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK_ERROR";
          message: string;
      }
    | {
          status: "MFA_NOT_INITIALIZED_ERROR";
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };
export default function updateTenantSecondaryFactor({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
