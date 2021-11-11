// @ts-nocheck
import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderGoogleWorkspacesConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    domain?: string;
    authorisationRedirect?: {
        params?: {
            [key: string]: string | ((request: any) => string);
        };
    };
    isDefault?: boolean;
};
export default function Google(config: TypeThirdPartyProviderGoogleWorkspacesConfig): TypeProvider;
export {};
