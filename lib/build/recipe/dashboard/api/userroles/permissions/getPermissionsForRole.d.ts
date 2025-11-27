// @ts-nocheck
import { APIFunction } from "../../../types";
declare const getPermissionsForRole: ({ stInstance, options, userContext }: Parameters<APIFunction>[0]) => Promise<
    | {
          status: "OK";
          permissions: string[];
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR" | "UNKNOWN_ROLE_ERROR";
      }
>;
export default getPermissionsForRole;
