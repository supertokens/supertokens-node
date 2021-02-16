import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderGithubConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: object;
    };
};
export default function Github(config: TypeThirdPartyProviderGithubConfig): TypeProvider;
export {};
