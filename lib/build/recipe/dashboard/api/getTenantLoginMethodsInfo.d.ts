// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
import { UserContext } from "../../../types";
declare type TenantLoginMethodType = {
    tenantId: string;
    firstFactors: string[];
};
export declare type Response = {
    status: "OK";
    tenants: TenantLoginMethodType[];
};
export default function getTenantLoginMethodsInfo(
    _: APIInterface,
    __: string,
    ___: APIOptions,
    userContext: UserContext
): Promise<Response>;
export {};
