// @ts-nocheck
import { APIFunction } from "../../../types";
declare const deleteRole: ({ stInstance, options, userContext }: Parameters<APIFunction>[0]) => Promise<
    | {
          status: "OK";
          didRoleExist: boolean;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
>;
export default deleteRole;
