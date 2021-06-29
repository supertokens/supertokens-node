import { TypeProvider } from "../types";
import { BaseRequest } from "../../../wrappers";
declare type TypeThirdPartyProviderGithubConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: {
            [key: string]: string | ((request: BaseRequest) => string);
        };
    };
};
export default function Github(config: TypeThirdPartyProviderGithubConfig): TypeProvider;
export {};
