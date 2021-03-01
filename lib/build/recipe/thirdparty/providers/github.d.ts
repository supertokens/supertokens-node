import { TypeProvider } from "../types";
import { Request } from "express";
declare type TypeThirdPartyProviderGithubConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: {
            [key: string]: string | ((request: Request) => string);
        };
    };
};
export default function Github(config: TypeThirdPartyProviderGithubConfig): TypeProvider;
export {};
