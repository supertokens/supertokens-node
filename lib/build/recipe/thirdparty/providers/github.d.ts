import { TypeProvider } from "../types";
import { BaseRequest } from "../../../frameworks";
declare type TypeThirdPartyProviderGithubConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: {
            [key: string]: string | ((request: BaseRequest) => Promise<string>);
        };
    };
};
export default function Github(config: TypeThirdPartyProviderGithubConfig): TypeProvider;
export {};
