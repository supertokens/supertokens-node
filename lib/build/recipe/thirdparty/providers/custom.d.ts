// @ts-nocheck
import { TypeProvider, ProviderInput } from "../types";
export declare const DEV_OAUTH_REDIRECT_URL = "https://supertokens.io/dev/oauth/redirect-to-app";
export declare function isUsingDevelopmentClientId(client_id: string): boolean;
export declare function getActualClientIdFromDevelopmentClientId(client_id: string): string;
export default function NewProvider(input: ProviderInput): TypeProvider;
