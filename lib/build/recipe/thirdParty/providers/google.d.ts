import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderGoogleConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: object;
    };
};
export default function Google(config: TypeThirdPartyProviderGoogleConfig): TypeProvider;
export {};
