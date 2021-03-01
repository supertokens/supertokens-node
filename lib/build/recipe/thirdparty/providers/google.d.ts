import { TypeProvider } from "../types";
import { Request } from "express";
declare type TypeThirdPartyProviderGoogleConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: {
            [key: string]: string | ((request: Request) => string);
        };
    };
};
export default function Google(config: TypeThirdPartyProviderGoogleConfig): TypeProvider;
export {};
