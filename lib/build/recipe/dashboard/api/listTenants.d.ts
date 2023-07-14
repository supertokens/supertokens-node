// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
import { ProviderConfig } from "../../thirdparty/types";
declare type TenantListTenantType = {
    tenantId: string;
    emailPassword: {
        enabled: boolean;
    };
    passwordless: {
        enabled: boolean;
    };
    thirdParty: {
        enabled: boolean;
        providers: ProviderConfig[];
    };
};
export declare type Response = {
    status: "OK";
    tenants: TenantListTenantType[];
};
export default function listTenants(_: APIInterface, __: string, ___: APIOptions, userContext: any): Promise<Response>;
export {};
