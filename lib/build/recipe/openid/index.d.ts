// @ts-nocheck
import OpenIdRecipe from "./recipe";
export default class OpenIdRecipeWrapper {
    static init: typeof OpenIdRecipe.init;
    static getOpenIdDiscoveryConfiguration(
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        issuer: string;
        jwks_uri: string;
        authorization_endpoint: string;
        token_endpoint: string;
        subject_types_supported: string[];
        id_token_signing_alg_values_supported: string[];
        response_types_supported: string[];
    }>;
    static createJWT(
        payload?: any,
        validitySeconds?: number,
        useStaticSigningKey?: boolean,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              jwt: string;
          }
        | {
              status: "UNSUPPORTED_ALGORITHM_ERROR";
          }
    >;
    static getJWKS(
        userContext?: Record<string, any>
    ): Promise<{
        keys: import("../jwt").JsonWebKey[];
        validityInSeconds?: number | undefined;
    }>;
}
export declare let init: typeof OpenIdRecipe.init;
export declare let getOpenIdDiscoveryConfiguration: typeof OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
export declare let createJWT: typeof OpenIdRecipeWrapper.createJWT;
export declare let getJWKS: typeof OpenIdRecipeWrapper.getJWKS;
