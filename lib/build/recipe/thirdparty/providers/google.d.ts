// @ts-nocheck
import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderGoogleConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: {
            [key: string]: string | ((request: any) => string);
        };
    };
};
export default function Google(config: TypeThirdPartyProviderGoogleConfig): TypeProvider;
export {};
