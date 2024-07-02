// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { UserContext } from "../../../../types";
declare type TenantWithLoginMethods = {
    tenantId: string;
    firstFactors: string[];
};
export declare type Response = {
    status: "OK";
    tenants: TenantWithLoginMethods[];
};
export default function listAllTenantsWithLoginMethods(
    _: APIInterface,
    __: string,
    ___: APIOptions,
    userContext: UserContext
): Promise<Response>;
export {};
