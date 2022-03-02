"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = require("./recipe");
class OpenIdRecipeWrapper {
    static getOpenIdDiscoveryConfiguration(userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeImplementation.getOpenIdDiscoveryConfiguration({
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static createJWT(payload, validitySeconds, userContext) {
        return recipe_1.default.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.createJWT({
            payload,
            validitySeconds,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static getJWKS(userContext) {
        return recipe_1.default.getInstanceOrThrowError().jwtRecipe.recipeInterfaceImpl.getJWKS({
            userContext: userContext === undefined ? {} : userContext,
        });
    }
}
exports.default = OpenIdRecipeWrapper;
OpenIdRecipeWrapper.init = recipe_1.default.init;
exports.init = OpenIdRecipeWrapper.init;
exports.getOpenIdDiscoveryConfiguration = OpenIdRecipeWrapper.getOpenIdDiscoveryConfiguration;
exports.createJWT = OpenIdRecipeWrapper.createJWT;
exports.getJWKS = OpenIdRecipeWrapper.getJWKS;
