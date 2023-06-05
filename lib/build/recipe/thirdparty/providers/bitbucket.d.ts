import { TypeProvider } from "../types";
declare type TypeThirdPartyProviderBitbucketConfig = {
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
export default function Bitbucket(config: TypeThirdPartyProviderBitbucketConfig): TypeProvider;
export {};
