// @ts-nocheck
import { ProviderConfig, ProviderConfigForClientType, TypeProvider } from "../types";
export type ClientAccessTokenCheck = (input: {
    accessToken: string;
    clientConfig: ProviderConfigForClientType;
    clientIds: Set<string>;
}) => Promise<void>;
/**
 * Before the user info is fetched with an access token that the client sent (in `oAuthTokens`), checks with the
 * provider that the access token was issued to one of the provider's clients.
 *
 * The check is skipped:
 * - if `validateAccessToken` is set in the provider config (custom.ts runs that instead, as before)
 * - for the access token the SDK got itself, by exchanging an authorisation code with the provider. This works because
 *   a new provider instance is created for every request.
 */
export declare function addClientAccessTokenCheck(
    impl: TypeProvider,
    providerConfig: ProviderConfig,
    check: ClientAccessTokenCheck
): void;
export declare const checkGoogleAccessToken: ClientAccessTokenCheck;
export declare const checkFacebookAccessToken: ClientAccessTokenCheck;
export declare const checkGitLabAccessToken: ClientAccessTokenCheck;
export declare const checkDiscordAccessToken: ClientAccessTokenCheck;
