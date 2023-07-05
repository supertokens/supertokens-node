// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
import { ProviderConfig } from "../../thirdparty/types";
export declare type Response = {
    status: "OK";
    tenants: {
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
        coreConfig: {
            [key: string]: any;
        };
    }[];
};
export default function listTenants(_: APIInterface, __: string, ___: APIOptions, userContext: any): Promise<Response>;
