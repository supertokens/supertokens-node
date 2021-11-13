// @ts-nocheck
import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderActiveDirectoryWorkspacesConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    tenantId: string;
    authorisationRedirect?: {
        params?: {
            [key: string]: string | ((request: any) => string);
        };
    };
    isDefault?: boolean;
};
export default function AD(config: TypeThirdPartyProviderActiveDirectoryWorkspacesConfig): TypeProvider;
export {};
