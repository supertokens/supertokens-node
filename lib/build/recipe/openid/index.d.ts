// @ts-nocheck
import OpenIDRecipe from "./recipe";
export default class OpenIDRecipeWrapper {
    static init: typeof OpenIDRecipe.init;
    static getDiscoveryConfiguration(): Promise<import("./types").DiscoveryConfiguration>;
    static createJWT(
        payload?: any,
        validitySeconds?: number
    ): Promise<
        | {
              status: "OK";
              jwt: string;
          }
        | {
              status: "UNSUPPORTED_ALGORITHM_ERROR";
          }
    >;
    static getJWKS(): Promise<{
        status: "OK";
        keys: import("../jwt").JsonWebKey[];
    }>;
}
export declare let init: typeof OpenIDRecipe.init;
export declare let getDiscoveryConfiguration: typeof OpenIDRecipeWrapper.getDiscoveryConfiguration;
export declare let createJWT: typeof OpenIDRecipeWrapper.createJWT;
export declare let getJWKS: typeof OpenIDRecipeWrapper.getJWKS;
