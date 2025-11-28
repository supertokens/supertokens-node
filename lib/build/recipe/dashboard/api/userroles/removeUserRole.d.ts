// @ts-nocheck
import { APIFunction } from "../../types";
declare const removeUserRole: ({ stInstance, tenantId, options, userContext }: Parameters<APIFunction>[0]) => Promise<
    | {
          status: "OK";
          didUserHaveRole: boolean;
      }
    | {
          status: "UNKNOWN_ROLE_ERROR" | "FEATURE_NOT_ENABLED_ERROR";
      }
>;
export default removeUserRole;
