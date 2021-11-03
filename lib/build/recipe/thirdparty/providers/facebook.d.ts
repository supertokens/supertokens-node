// @ts-nocheck
import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderFacebookConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    isDefault?: boolean;
};
export default function Facebook(config: TypeThirdPartyProviderFacebookConfig): TypeProvider;
export {};
