// @ts-nocheck
import OpenIdRecipe from "./recipe";
export default class OpenIdRecipeWrapper {
    static init: typeof OpenIdRecipe.init;
    static getOpenIdDiscoveryConfiguration(
        userContext?: Record<string, any>
    ): Promise<import("./types").GetOpenIdDiscoveryConfigurationResponse>;
}
export declare let init: typeof OpenIdRecipe.init;
export declare let getOpenIdDiscoveryConfiguration: typeof OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
export type { GetOpenIdDiscoveryConfigurationResponse, CreateJWTResponse } from "./types";
