// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
declare const createRole: (
    _: APIInterface,
    __: string,
    options: APIOptions,
    ___: any
) => Promise<{
    status: "OK" | "ROLE_ALREADY_EXITS";
}>;
export default createRole;
