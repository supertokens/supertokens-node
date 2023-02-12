// @ts-nocheck
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
        params?: {
            [key: string]: string | ((request: any) => string);
        };
    };
    isDefault?: boolean;
};
export default function Apple(config: TypeThirdPartyProviderAppleConfig): TypeProvider;
export {};
