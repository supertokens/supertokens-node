// @ts-nocheck
import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderOktaConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: {
            [key: string]: string | ((request: any) => string);
        };
    };
    oktaDomain: string;
    authorizationServerId?: string;
    isDefault?: boolean;
};
export default function Github(config: TypeThirdPartyProviderOktaConfig): TypeProvider;
export {};
