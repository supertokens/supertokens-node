import { TypeProvider } from "../types";
import { BaseRequest } from "../../../wrappers";
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
            [key: string]: string | ((request: BaseRequest) => Promise<string>);
        };
    };
};
export default function Apple(config: TypeThirdPartyProviderAppleConfig): TypeProvider;
export {};
