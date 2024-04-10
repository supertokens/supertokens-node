// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
export declare type Response =
    | {
          status: "OK";
          isMfaRequirementsForAuthOverridden: boolean;
      }
    | {
          status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK";
          message: string;
      }
    | {
          status: "MFA_NOT_INITIALIZED";
      }
    | {
          status: "MFA_REQUIREMENTS_FOR_AUTH_OVERRIDDEN";
      }
    | {
          status: "UNKNOWN_TENANT_ERROR";
      };
export default function updateTenantSecondaryFactor(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
