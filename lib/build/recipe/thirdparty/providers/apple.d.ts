import { TypeProvider } from "../types";
import { Request } from "express";
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
            [key: string]: string | ((request: Request) => string);
        };
    };
};
export default function Apple(config: TypeThirdPartyProviderAppleConfig): TypeProvider;
export {};
