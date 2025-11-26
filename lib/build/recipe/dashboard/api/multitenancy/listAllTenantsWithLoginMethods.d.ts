// @ts-nocheck
import { APIFunction } from "../../types";
type TenantWithLoginMethods = {
    tenantId: string;
    firstFactors: string[];
};
export type Response = {
    status: "OK";
    tenants: TenantWithLoginMethods[];
};
export default function listAllTenantsWithLoginMethods({
    stInstance,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
export {};
