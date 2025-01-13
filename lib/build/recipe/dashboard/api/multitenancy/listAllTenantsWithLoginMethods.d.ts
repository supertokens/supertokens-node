// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { UserContext } from "../../../../types";
type TenantWithLoginMethods = {
    tenantId: string;
    firstFactors: string[];
};
export type Response = {
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
