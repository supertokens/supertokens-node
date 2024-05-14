// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { CoreConfigFieldInfo } from "../../../multitenancy/types";
export declare type Response = {
    status: "OK";
    config: CoreConfigFieldInfo[];
};
export default function listAllCoreConfigProperties(
    _: APIInterface,
    tenantId: string,
    ___: APIOptions,
    userContext: any
): Promise<Response>;
