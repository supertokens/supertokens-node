// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare const addRoleToUser: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
) => Promise<{
    status: "OK" | "UNKNOWN_ROLE_ERROR" | "ROLE_ALREADY_ASSIGNED";
}>;
export default addRoleToUser;
