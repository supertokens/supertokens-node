// @ts-nocheck
import { UserContext } from "../../types";
import Recipe from "./recipe";
import { RecipeInterface, APIInterface, APIOptions, OAuthTokens } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static getAuthorisationRedirectURL(
        redirectURIOnProviderDashboard: string,
        userContext: UserContext
    ): Promise<{
        urlWithQueryParams: string;
        pkceCodeVerifier?: string | undefined;
    }>;
    static exchangeAuthCodeForOAuthTokens(
        redirectURIInfo: {
            redirectURIOnProviderDashboard: string;
            redirectURIQueryParams: any;
            pkceCodeVerifier?: string | undefined;
        },
        userContext: UserContext
    ): Promise<import("./types").OAuthTokenResponse>;
    static getUserInfo(oAuthTokens: OAuthTokens, userContext: UserContext): Promise<import("./types").UserInfo>;
}
export declare let init: typeof Recipe.init;
export declare let getAuthorisationRedirectURL: typeof Wrapper.getAuthorisationRedirectURL;
export declare let exchangeAuthCodeForOAuthTokens: typeof Wrapper.exchangeAuthCodeForOAuthTokens;
export declare let getUserInfo: typeof Wrapper.getUserInfo;
export type { RecipeInterface, APIInterface, APIOptions };
