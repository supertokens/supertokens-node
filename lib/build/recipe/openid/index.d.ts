import OpenIdRecipe from "./recipe";
export default class OpenIdRecipeWrapper {
    static init: typeof OpenIdRecipe.init;
    static getOpenIdDiscoveryConfiguration(): any;
    static createJWT(payload?: any, validitySeconds?: number): any;
    static getJWKS(): any;
}
export declare let init: typeof OpenIdRecipe.init;
export declare let getOpenIdDiscoveryConfiguration: typeof OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
export declare let createJWT: typeof OpenIdRecipeWrapper.createJWT;
export declare let getJWKS: typeof OpenIdRecipeWrapper.getJWKS;
