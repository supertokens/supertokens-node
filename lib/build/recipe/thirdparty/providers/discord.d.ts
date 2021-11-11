// @ts-nocheck
import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderDiscordConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: {
            [key: string]: string | ((request: any) => string);
        };
    };
    isDefault?: boolean;
};
export default function Github(config: TypeThirdPartyProviderDiscordConfig): TypeProvider;
export {};
