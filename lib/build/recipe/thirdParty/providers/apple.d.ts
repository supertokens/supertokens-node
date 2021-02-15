import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderAppleConfig = {
    clientId: string;
    clientSecret: {
        keyId: string;
        privateKey: string;
        teamId: string;
    };
    scope?: string[];
    authorisationRedirect?: {
        params?: object;
    };
};
export default function Apple(config: TypeThirdPartyProviderAppleConfig): TypeProvider;
export {};
