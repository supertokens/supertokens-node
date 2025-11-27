// @ts-nocheck
import { APIFunction } from "../../../types";
declare const removePermissionsFromRole: ({ stInstance, options, userContext }: Parameters<APIFunction>[0]) => Promise<{
    status: "OK" | "UNKNOWN_ROLE_ERROR" | "FEATURE_NOT_ENABLED_ERROR";
}>;
export default removePermissionsFromRole;
