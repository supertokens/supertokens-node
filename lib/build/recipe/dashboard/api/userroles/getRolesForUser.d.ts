// @ts-nocheck
import { APIFunction } from "../../types";
declare const getRolesForUser: ({ stInstance, tenantId, options, userContext }: Parameters<APIFunction>[0]) => Promise<
    | {
          status: "OK";
          roles: string[];
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
>;
export default getRolesForUser;
