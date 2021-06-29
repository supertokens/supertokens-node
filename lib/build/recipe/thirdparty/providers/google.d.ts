import { TypeProvider } from "../types";
import { BaseRequest } from "../../../wrappers";
declare type TypeThirdPartyProviderGoogleConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: {
            [key: string]: string | ((request: BaseRequest) => string);
        };
    };
};
export default function Google(config: TypeThirdPartyProviderGoogleConfig): TypeProvider;
export {};
