// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { CoreConfigProperty } from "../../../../types";
export declare type Response = {
    status: "OK";
    config: Array<CoreConfigProperty>;
};
export default function listAllCoreConfigProperties(
    _: APIInterface,
    tenantId: string,
    ___: APIOptions,
    userContext: any
): Promise<Response>;
