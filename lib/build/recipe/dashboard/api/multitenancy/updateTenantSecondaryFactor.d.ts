// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { UserContext } from "../../../../types";
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
export default function updateTenantSecondaryFactor(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response>;
