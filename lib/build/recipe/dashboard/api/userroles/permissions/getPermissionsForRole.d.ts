// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
declare const getPermissionsForRole: (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    __: any
) => Promise<{
    status: "OK";
    permissions: string[];
}>;
export default getPermissionsForRole;
