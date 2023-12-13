import { UserContext } from "../../types";
import OpenIdRecipe from "./recipe";

export default class OpenIdRecipeWrapper {
    static init = OpenIdRecipe.init;

    static getOpenIdDiscoveryConfiguration(userContext?: UserContext) {
        return OpenIdRecipe.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration({
            userContext: userContext === undefined ? ({} as UserContext) : userContext,
        });
    }

    static createJWT(
        payload?: any,
        validitySeconds?: number,
        useStaticSigningKey?: boolean,
        userContext?: UserContext
    ) {
        return OpenIdRecipe.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.createJWT({
            payload,
            validitySeconds,
            useStaticSigningKey,
            userContext: userContext === undefined ? ({} as UserContext) : userContext,
        });
    }

    static getJWKS(userContext?: UserContext) {
        return OpenIdRecipe.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.getJWKS({
            userContext: userContext === undefined ? ({} as UserContext) : userContext,
        });
    }
}

export let init = OpenIdRecipeWrapper.init;
export let getOpenIdDiscoveryConfiguration = OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
export let createJWT = OpenIdRecipeWrapper.createJWT;
export let getJWKS = OpenIdRecipeWrapper.getJWKS;
