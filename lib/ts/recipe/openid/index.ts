import OpenIdRecipe from "./recipe";

export default class OpenIdRecipeWrapper {
    static init = OpenIdRecipe.init;

    static getOpenIdDiscoveryConfiguration() {
        return OpenIdRecipe.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration();
    }

    static createJWT(payload?: any, validitySeconds?: number) {
        return OpenIdRecipe.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.createJWT({
            payload,
            validitySeconds,
        });
    }

    static getJWKS() {
        return OpenIdRecipe.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.getJWKS();
    }
}

export let init = OpenIdRecipeWrapper.init;
export let getOpenIdDiscoveryConfiguration = OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
export let createJWT = OpenIdRecipeWrapper.createJWT;
export let getJWKS = OpenIdRecipeWrapper.getJWKS;
