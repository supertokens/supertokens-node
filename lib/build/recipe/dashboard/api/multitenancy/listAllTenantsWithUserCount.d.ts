// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
export declare type Response = {
    status: "OK";
    tenants: Array<{
        tenantId: string;
        userCount: number;
    }>;
};
export default function listAllTenantsWithUserCount(
    _: APIInterface,
    __: string,
    ___: APIOptions,
    userContext: any
): Promise<Response>;
