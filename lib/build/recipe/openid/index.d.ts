// @ts-nocheck
import OpenIdRecipe from "./recipe";
export default class OpenIdRecipeWrapper {
    static init: typeof OpenIdRecipe.init;
    static getOpenIdDiscoveryConfiguration(userContext?: Record<string, any>): Promise<{
        status: "OK";
        issuer: string;
        jwks_uri: string;
        authorization_endpoint: string;
        token_endpoint: string;
        userinfo_endpoint: string;
        revocation_endpoint: string;
        token_introspection_endpoint: string;
        end_session_endpoint: string;
        subject_types_supported: string[];
        id_token_signing_alg_values_supported: string[];
        response_types_supported: string[];
    }>;
}
export declare let init: typeof OpenIdRecipe.init;
export declare let getOpenIdDiscoveryConfiguration: typeof OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
