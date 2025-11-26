// @ts-nocheck
import { APIFunction } from "../../../types";
declare const createRoleOrAddPermissions: ({ stInstance, options, userContext }: Parameters<APIFunction>[0]) => Promise<
    | {
          status: "OK";
          createdNewRole: boolean;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
>;
export default createRoleOrAddPermissions;
