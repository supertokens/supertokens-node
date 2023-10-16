// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
declare const createRole: (
    _: APIInterface,
    __: string,
    options: APIOptions,
    ___: any
) => Promise<{
    status: "OK";
    createdNewRole: boolean;
}>;
export default createRole;
