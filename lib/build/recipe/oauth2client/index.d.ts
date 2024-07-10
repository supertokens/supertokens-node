// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface, APIInterface, APIOptions, ProviderConfigWithOIDCInfo, OAuthTokens } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static getAuthorisationRedirectURL(input: {
        redirectURIOnProviderDashboard: string;
    }): Promise<{
        urlWithQueryParams: string;
        pkceCodeVerifier?: string | undefined;
    }>;
    static exchangeAuthCodeForOAuthTokens(input: {
        providerConfig: ProviderConfigWithOIDCInfo;
        redirectURIInfo: {
            redirectURIOnProviderDashboard: string;
            redirectURIQueryParams: any;
            pkceCodeVerifier?: string | undefined;
        };
    }): Promise<import("./types").OAuthTokenResponse>;
    static getUserInfo(input: {
        providerConfig: ProviderConfigWithOIDCInfo;
        oAuthTokens: OAuthTokens;
    }): Promise<import("./types").UserInfo>;
}
export declare let init: typeof Recipe.init;
export declare let getAuthorisationRedirectURL: typeof Wrapper.getAuthorisationRedirectURL;
export declare let exchangeAuthCodeForOAuthTokens: typeof Wrapper.exchangeAuthCodeForOAuthTokens;
export declare let getUserInfo: typeof Wrapper.getUserInfo;
export type { RecipeInterface, APIInterface, APIOptions };
