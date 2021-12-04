import OpenIDRecipe from "./recipe";

export default class OpenIDRecipeWrapper {
    static init = OpenIDRecipe.init;

    static getDiscoveryConfiguration() {
        return OpenIDRecipe.getInstanceOrThrowError().recipeImplementation.getDiscoveryConfiguration();
    }

    static createJWT(payload?: any, validitySeconds?: number) {
        return OpenIDRecipe.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.createJWT({
            payload,
            validitySeconds,
        });
    }

    static getJWKS() {
        return OpenIDRecipe.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.getJWKS();
    }
}

export let init = OpenIDRecipeWrapper.init;
export let getDiscoveryConfiguration = OpenIDRecipeWrapper.getDiscoveryConfiguration;
export let createJWT = OpenIDRecipeWrapper.createJWT;
export let getJWKS = OpenIDRecipeWrapper.getJWKS;
