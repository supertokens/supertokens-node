import OpenIdRecipe from "./recipe";
import { BaseRequest } from "../../framework";

export default class OpenIdRecipeWrapper {
    static init = OpenIdRecipe.init;

    static getOpenIdDiscoveryConfiguration(userContext?: any) {
        return OpenIdRecipe.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration({
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static createJWT(
        req: BaseRequest,
        payload?: any,
        validitySeconds?: number,
        useStaticSigningKey?: boolean,
        userContext?: any
    ) {
        return OpenIdRecipe.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.createJWT({
            req,
            payload,
            validitySeconds,
            useStaticSigningKey,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static getJWKS(userContext?: any) {
        return OpenIdRecipe.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.getJWKS({
            userContext: userContext === undefined ? {} : userContext,
        });
    }
}

export let init = OpenIdRecipeWrapper.init;
export let getOpenIdDiscoveryConfiguration = OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
export let createJWT = OpenIdRecipeWrapper.createJWT;
export let getJWKS = OpenIdRecipeWrapper.getJWKS;
