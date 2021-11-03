// @ts-nocheck
import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderGithubConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: {
            [key: string]: string | ((request: any) => string);
        };
    };
    primary?: boolean;
};
export default function Github(config: TypeThirdPartyProviderGithubConfig): TypeProvider;
export {};
