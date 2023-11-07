// @ts-nocheck
import { APIInterface, APIOptions } from "../../../types";
declare const createRole: (
    _: APIInterface,
    __: string,
    options: APIOptions,
    ___: any
) => Promise<{
    status: "OK" | "ROLE_ALREADY_EXITS" | "FEATURE_NOT_ENABLED_ERROR";
}>;
export default createRole;
