// @ts-nocheck
import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderGitLabConfig = {
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
export default function GitLab(config: TypeThirdPartyProviderGitLabConfig): TypeProvider;
export {};
