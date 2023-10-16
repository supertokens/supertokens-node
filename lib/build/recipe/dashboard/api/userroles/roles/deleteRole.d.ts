// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
declare const deleteRole: (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    __: any
) => Promise<{
    status: "OK" | "ROLE_DO_NOT_EXISTS";
}>;
export default deleteRole;
